-- 0019 — Patient messages go by EMAIL (Resend) instead of SMS (SMS Ethiopia).
--
-- Same outbox design as 0008, renamed:
--   appointment change ──(deferred trigger, at COMMIT)──▶ email_log rows ('queued', subject + body rendered)
--   ──(pg_net kick + pg_cron every minute)──▶ send-email Edge Function ──▶ Resend
--
--   • sms_log → email_log (to_phone → to_email, no segments/encoding), sms_templates → email_templates
--     (+ subject), enums sms_type/sms_status → email_type/email_status (+ 'bounced', 'complained').
--     Old rows stay: they keep provider = 'smsethiopia' and a phone number in to_email.
--   • The booking form asks for an e-mail address. It is stored on the appointment (appointments.email)
--     so a booking made with someone else's phone number can never redirect that patient's messages;
--     patients.email is only filled in when it is still empty.
--   • Patients without an e-mail address (walk-ins) get a 'skipped' row, so staff see it and call them.
--   • The clinic's own "new online booking" alert is gone (settings.owner_alert_phones and
--     locations.alert_phone are dropped). The dashboard shows new bookings live.
--   • Phone numbers: Safaricom (07…) is accepted now; the 09-only rule came from SMS Ethiopia.

------------------------------------------------------------------------------
-- Types and tables
------------------------------------------------------------------------------
alter type public.sms_type   rename to email_type;
alter type public.sms_status rename to email_status;
alter type public.email_status add value if not exists 'bounced';
alter type public.email_status add value if not exists 'complained';

alter table public.sms_log rename to email_log;
alter table public.email_log rename column to_phone to to_email;
alter table public.email_log drop column if exists segments;
alter table public.email_log drop column if exists encoding;
alter table public.email_log add column if not exists subject text;
alter table public.email_log alter column provider set default 'resend';
comment on column public.email_log.to_email is
  'Recipient e-mail address. Rows with provider = ''smsethiopia'' are old text messages and hold a phone number.';

alter index if exists public.sms_log_pkey            rename to email_log_pkey;
alter index if exists public.sms_log_created_idx     rename to email_log_created_idx;
alter index if exists public.sms_log_status_idx      rename to email_log_status_idx;
alter index if exists public.sms_log_appointment_idx rename to email_log_appointment_idx;
alter index if exists public.sms_log_provider_id_idx rename to email_log_provider_id_idx;
alter index if exists public.sms_log_queue_idx       rename to email_log_queue_idx;
alter index if exists public.sms_log_poll_idx        rename to email_log_poll_idx;

alter table public.sms_templates rename to email_templates;
alter index if exists public.sms_templates_pkey rename to email_templates_pkey;
alter table public.email_templates add column if not exists subject text;
alter table public.email_templates drop constraint if exists sms_templates_body_check;
alter table public.email_templates add constraint email_templates_body_check check (char_length(body) between 1 and 5000);

alter policy "sms_templates: staff read"        on public.email_templates rename to "email_templates: staff read";
alter policy "sms_templates: owner update"      on public.email_templates rename to "email_templates: owner update";
alter policy "sms_templates: owner insert"      on public.email_templates rename to "email_templates: owner insert";
alter policy "sms_log: staff read own location" on public.email_log       rename to "email_log: staff read own location";
alter trigger audit_sms_templates on public.email_templates rename to audit_email_templates;

alter table public.settings rename column sms_enabled to email_enabled;
alter table public.settings drop column if exists owner_alert_phones;
alter table public.locations drop column if exists alert_phone;

-- E-mail given with this booking (see header). Staff may correct it from the dashboard.
alter table public.appointments add column if not exists email text
  check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');
grant update (email) on public.appointments to authenticated;

------------------------------------------------------------------------------
-- Phone numbers: Ethio Telecom (09…) and Safaricom (07…)
------------------------------------------------------------------------------
alter table public.patients drop constraint if exists patients_phone_check;
alter table public.patients add constraint patients_phone_check check (phone ~ '^\+251[79][0-9]{8}$');
alter table public.profiles drop constraint if exists profiles_phone_check;
alter table public.profiles add constraint profiles_phone_check check (phone is null or phone ~ '^\+251[79][0-9]{8}$');

------------------------------------------------------------------------------
-- Default e-mail texts. Bodies are plain text (the worker turns them into a simple HTML e-mail).
-- Only templates still holding the last default SMS wording (0010) are rewritten.
------------------------------------------------------------------------------
update public.email_templates t set body = n.body
from (values
  ('booking_confirmed',
   'Roha Dental {location}: {patient_name}, confirmed: {service}, {date} {time}. Change/cancel: {manage_link}',
   E'Hi {patient_name},\n\nYour appointment at Roha Speciality Dental Center is confirmed.\n\nTreatment: {service}\nDate: {date} ({local_date})\nTime: {time} ({local_time})\nClinic: {location}\nDentist: {dentist}\n\nNeed to change or cancel? Use your personal link:\n{manage_link}\n\nQuestions? Call us on {location_phone}.\n\nSee you soon,\nRoha Speciality Dental Center'),
  ('booking_cancelled',
   'Roha Dental: your appointment {date} {time} is cancelled. To book again call {location_phone} or rohadent.com/book',
   E'Hi {patient_name},\n\nYour appointment on {date} at {time} at our {location} clinic has been cancelled.\n\nTo book a new time, visit rohadent.com/book or call us on {location_phone}.\n\nRoha Speciality Dental Center'),
  ('booking_rescheduled',
   'Roha Dental {location}: your appointment is moved to {date} {time}. Details: {manage_link}',
   E'Hi {patient_name},\n\nYour appointment has been moved.\n\nNew date: {date} ({local_date})\nNew time: {time} ({local_time})\nTreatment: {service}\nClinic: {location}\nDentist: {dentist}\n\nDetails, changes or cancelling:\n{manage_link}\n\nQuestions? Call us on {location_phone}.\n\nRoha Speciality Dental Center')
) as n(key, old_body, body)
where t.key = n.key::public.email_type and t.locale = 'en' and t.body = n.old_body;

update public.email_templates t set subject = n.subject
from (values
  ('booking_confirmed',   'Your appointment is confirmed: {date} at {time}'),
  ('booking_cancelled',   'Your appointment on {date} has been cancelled'),
  ('booking_rescheduled', 'Your appointment has moved to {date} at {time}'),
  ('manual',              'A message from Roha Dental')
) as n(key, subject)
where t.key = n.key::public.email_type and t.subject is null;
update public.email_templates set subject = 'Roha Dental' where subject is null;
alter table public.email_templates alter column subject set not null;
alter table public.email_templates add constraint email_templates_subject_check check (char_length(subject) between 1 and 200);

-- No more clinic alerts.
update public.email_log
   set status = 'skipped', error = 'Clinic booking alerts were turned off'
 where type = 'clinic_new_booking' and status = 'queued';
delete from public.email_templates where key = 'clinic_new_booking';

------------------------------------------------------------------------------
-- Drop the SMS functions and triggers (recreated below under e-mail names)
------------------------------------------------------------------------------
drop trigger if exists appointments_sms_events on public.appointments;
drop trigger if exists sms_log_kick_worker on public.email_log;
drop function if exists public.appointments_sms_events();
drop function if exists public._enqueue_appointment_sms(uuid, public.email_type);
drop function if exists public.claim_sms_batch(int);
drop function if exists public.resend_sms(uuid);
drop function if exists public.sms_worker_tick();
drop function if exists public.kick_sms_worker();
drop function if exists public.sms_log_after_insert();
drop function if exists public.render_sms_template(text, jsonb);

------------------------------------------------------------------------------
-- Template rendering:  'Hi {patient_name}' + {"patient_name":"Abebe"} → 'Hi Abebe'
------------------------------------------------------------------------------
create or replace function public.render_template(p_body text, p_vars jsonb)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_out text := p_body;
  r record;
begin
  for r in select key, value from jsonb_each_text(coalesce(p_vars, '{}'::jsonb)) loop
    v_out := replace(v_out, '{' || r.key || '}', coalesce(r.value, ''));
  end loop;
  return v_out;
end;
$$;

------------------------------------------------------------------------------
-- Enqueue one e-mail type for one appointment (internal)
------------------------------------------------------------------------------
create or replace function public._enqueue_appointment_email(p_appointment_id uuid, p_type public.email_type)
returns int
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_cfg     public.settings;
  v         record;
  v_tpl     record;
  v_vars    jsonb;
  v_status  public.email_status;
  v_error   text;
begin
  if p_type = 'clinic_new_booking' then return 0; end if;   -- retired
  select * into v_cfg from public.settings s where s.id;

  select a.id, a.status, a.starts_at, a.location_id,
         coalesce(a.email, p.email) as to_email,
         p.full_name, p.phone as patient_phone,
         l.city, l.phone as location_phone,
         d.full_name as dentist_name, s.name as service_name,
         sec.manage_token
    into v
  from public.appointments a
  join public.patients  p on p.id = a.patient_id
  join public.locations l on l.id = a.location_id
  join public.dentists  d on d.id = a.dentist_id
  join public.services  s on s.id = a.service_id
  left join public.appointment_secrets sec on sec.appointment_id = a.id
  where a.id = p_appointment_id;
  if not found then return 0; end if;

  select t.subject, t.body into v_tpl
  from public.email_templates t
  where t.key = p_type and t.locale = 'en' and t.is_active;

  v_vars := jsonb_build_object(
    'patient_name',      split_part(v.full_name, ' ', 1),
    'patient_full_name', v.full_name,
    'patient_phone',     v.patient_phone,
    'date',              to_char(v.starts_at at time zone public.clinic_tz(), 'Dy FMDD Mon'),
    'time',              to_char(v.starts_at at time zone public.clinic_tz(), 'HH24:MI'),
    'local_time',        public.ethiopian_time(v.starts_at),
    'local_date',        public.ethiopian_date((v.starts_at at time zone public.clinic_tz())::date),
    'service',           v.service_name,
    'location',          v.city,
    'location_phone',    v.location_phone,
    'dentist',           v.dentist_name,
    'status',            v.status,
    'manage_link',       rtrim(v_cfg.public_site_url, '/') ||
                         case when v.manage_token is null then '' else '/b/' || v.manage_token end
  );

  v_status := case when not v_cfg.email_enabled or v_tpl.body is null or v.to_email is null
                   then 'skipped' else 'queued' end;
  v_error  := case when not v_cfg.email_enabled then 'E-mail is turned off in settings'
                   when v_tpl.body is null then 'Template "' || p_type || '" is disabled'
                   when v.to_email is null then 'Patient has no email address' end;

  insert into public.email_log (appointment_id, location_id, type, to_email, subject, body, status, error)
  values (v.id, v.location_id, p_type, coalesce(v.to_email, '(no email)'),
          public.render_template(coalesce(v_tpl.subject, ''), v_vars),
          coalesce(nullif(public.render_template(coalesce(v_tpl.body, ''), v_vars), ''), '(empty template)'),
          v_status, v_error);
  return 1;
end;
$$;

------------------------------------------------------------------------------
-- Appointment events → e-mail (same rules as 0016, without the clinic alert)
--   confirmed  → booking_confirmed (also for bookings created as confirmed)
--   cancelled  → booking_cancelled
--   new time   → booking_rescheduled, only for an already-confirmed booking
------------------------------------------------------------------------------
create or replace function public.appointments_email_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'confirmed' then
      perform public._enqueue_appointment_email(new.id, 'booking_confirmed');
    end if;
    return null;
  end if;

  if new.status = 'cancelled' and old.status <> 'cancelled' then
    perform public._enqueue_appointment_email(new.id, 'booking_cancelled');
  elsif new.status = 'confirmed' and old.status = 'pending' then
    perform public._enqueue_appointment_email(new.id, 'booking_confirmed');
  elsif new.starts_at <> old.starts_at and new.status = 'confirmed' and old.status = 'confirmed' then
    perform public._enqueue_appointment_email(new.id, 'booking_rescheduled');
  end if;
  return null;
end;
$$;

create constraint trigger appointments_email_events
  after insert or update on public.appointments
  deferrable initially deferred
  for each row execute function public.appointments_email_events();

------------------------------------------------------------------------------
-- Worker queue claim (send-email Edge Function, service_role).
-- Also rescues rows stuck in 'sending' (worker crashed mid-batch).
------------------------------------------------------------------------------
create or replace function public.claim_email_batch(p_limit int default 20)
returns setof public.email_log
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  update public.email_log
     set status = 'queued', error = coalesce(error, 'worker timeout; retrying')
   where status = 'sending' and updated_at < now() - interval '5 minutes';

  return query
    update public.email_log l
       set status = 'sending', attempts = l.attempts + 1
     where l.id in (
       select q.id from public.email_log q
       where q.status = 'queued' and (q.next_attempt_at is null or q.next_attempt_at <= now())
       order by q.created_at
       limit greatest(1, least(p_limit, 100))
       for update skip locked)
    returning l.*;
end;
$$;

------------------------------------------------------------------------------
-- Dashboard: send an e-mail again (staff for own location, owner all).
-- Goes to the appointment's current address, so a corrected address is used.
------------------------------------------------------------------------------
create or replace function public.resend_email(p_email_id uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v    public.email_log;
  v_to text;
  v_id uuid;
begin
  select * into v from public.email_log where id = p_email_id;
  if not found or not (public.is_owner() or (v.location_id is not null and v.location_id = public.my_location_id())) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;
  select coalesce(a.email, p.email) into v_to
  from public.appointments a join public.patients p on p.id = a.patient_id
  where a.id = v.appointment_id;
  v_to := coalesce(v_to, case when v.to_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then v.to_email end);
  if v_to is null then
    raise exception using errcode = 'P0001', message = 'NO_EMAIL';
  end if;
  insert into public.email_log (appointment_id, location_id, type, to_email, subject, body, status, resend_of, created_by)
  values (v.appointment_id, v.location_id, v.type, v_to, coalesce(v.subject, 'Roha Dental'), v.body, 'queued', v.id, auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

------------------------------------------------------------------------------
-- Kick the send-email worker via pg_net right after new queued rows are committed.
-- Needs two Vault secrets: 'project_url' and 'email_worker_secret' (see README).
-- No-ops quietly where pg_net/Vault aren't available (PGlite tests); pg_cron is the safety net.
------------------------------------------------------------------------------
create or replace function public.kick_email_worker()
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_url    text;
  v_secret text;
begin
  if to_regnamespace('net') is null or to_regclass('vault.decrypted_secrets') is null then
    return;
  end if;
  execute $q$select decrypted_secret from vault.decrypted_secrets where name = 'project_url'$q$ into v_url;
  execute $q$select decrypted_secret from vault.decrypted_secrets where name = 'email_worker_secret'$q$ into v_secret;
  if v_url is null or v_secret is null then
    raise warning 'kick_email_worker: Vault secrets project_url / email_worker_secret are missing';
    return;
  end if;
  execute $q$select net.http_post(url := $1, body := '{}'::jsonb,
                                   headers := jsonb_build_object('Content-Type', 'application/json', 'x-worker-secret', $2),
                                   timeout_milliseconds := 20000)$q$
    using rtrim(v_url, '/') || '/functions/v1/send-email', v_secret;
end;
$$;

-- pg_cron tick: only call the worker when something is queued or a delivery status is due for a check.
create or replace function public.email_worker_tick()
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.email_log
             where (status = 'queued' and (next_attempt_at is null or next_attempt_at <= now()))
                or (status = 'sending' and updated_at < now() - interval '5 minutes')
                or (status in ('accepted', 'sent') and provider_message_id is not null
                    and created_at > now() - interval '24 hours'
                    and (last_checked_at is null or last_checked_at < now() - interval '2 minutes'))) then
    perform public.kick_email_worker();
    return true;
  end if;
  return false;
end;
$$;

create or replace function public.email_log_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from inserted where status = 'queued') then
    perform public.kick_email_worker();
  end if;
  return null;
end;
$$;

create trigger email_log_kick_worker
  after insert on public.email_log
  referencing new table as inserted
  for each statement execute function public.email_log_after_insert();

------------------------------------------------------------------------------
-- Patients and booking RPCs: e-mail address
------------------------------------------------------------------------------
drop function if exists public.book_appointment(uuid, uuid, uuid, timestamptz, text, text, text);
drop function if exists public.staff_create_appointment(uuid, uuid, uuid, timestamptz, text, text,
  public.appointment_source, public.appointment_status, timestamptz, text);
drop function if exists public._upsert_patient(text, text);

-- '  Abebe@Mail.com ' → 'abebe@mail.com'; '' / null → null; anything else invalid → INVALID_EMAIL
create or replace function public._clean_email(p_email text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare v text := lower(btrim(coalesce(p_email, '')));
begin
  if v = '' then return null; end if;
  if char_length(v) > 254 or v !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception using errcode = 'P0001', message = 'INVALID_EMAIL';
  end if;
  return v;
end;
$$;

-- Same as 0011 (an existing patient's saved name is never changed), plus: the e-mail address
-- is saved on the patient only while the patient has none.
create or replace function public._upsert_patient(p_phone text, p_full_name text, p_email text default null)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_name  text := btrim(regexp_replace(coalesce(p_full_name, ''), '\s+', ' ', 'g'));
  v_email text := public._clean_email(p_email);
  v_id    uuid;
begin
  if p_phone is null or p_phone !~ '^\+251[79][0-9]{8}$' then
    raise exception using errcode = 'P0001', message = 'INVALID_PHONE';
  end if;
  if char_length(v_name) not between 2 and 100
     or v_name ~* '(https?:|www\.|[a-z0-9-]\.[a-z]{2,}|[@/\\:<>]|[0-9])' then
    raise exception using errcode = 'P0001', message = 'INVALID_NAME';
  end if;

  select p.id into v_id from public.patients p where p.phone = p_phone;
  if v_id is null then
    insert into public.patients (phone, full_name, email)
    values (p_phone, v_name, v_email)
    on conflict (phone) do nothing
    returning id into v_id;
    if v_id is null then -- a parallel booking inserted the same phone first
      select p.id into v_id from public.patients p where p.phone = p_phone;
    end if;
  end if;
  if v_email is not null then
    update public.patients p set email = v_email where p.id = v_id and p.email is null;
  end if;
  return v_id;
end;
$$;

------------------------------------------------------------------------------
-- Online booking — called ONLY by the create-booking Edge Function (service_role).
-- Same as 0004, plus the e-mail address (stored on the appointment; see header).
------------------------------------------------------------------------------
create or replace function public.book_appointment(
  p_location_id   uuid,
  p_service_id    uuid,
  p_dentist_id    uuid,
  p_starts_at     timestamptz,
  p_full_name     text,
  p_phone         text,
  p_patient_notes text default null,
  p_email         text default null   -- required by the create-booking Edge Function (Zod)
)
returns table (
  appointment_id uuid,
  manage_token   text,
  status         public.appointment_status,
  dentist_id     uuid,
  starts_at      timestamptz,
  ends_at        timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_cfg        public.settings;
  v_patient_id uuid;
  v_email      text := public._clean_email(p_email);
  v_token      text;
  v_slot       record;
  v_status     public.appointment_status;
  v_id         uuid;
  v_active     int;
  v_notes      text := nullif(btrim(coalesce(p_patient_notes, '')), '');
  v_day        date := (p_starts_at at time zone public.clinic_tz())::date;
begin
  if p_starts_at is null then
    raise exception using errcode = 'P0001', message = 'SLOT_UNAVAILABLE';
  end if;
  if v_notes is not null and char_length(v_notes) > 500 then
    raise exception using errcode = 'P0001', message = 'INVALID_NOTES';
  end if;

  select * into v_cfg from public.settings s where s.id;
  v_patient_id := public._upsert_patient(p_phone, p_full_name, v_email);

  -- Serialize concurrent bookings by the same patient, then cap active future bookings.
  perform 1 from public.patients p where p.id = v_patient_id for update;
  select count(*) into v_active
  from public.appointments a
  where a.patient_id = v_patient_id and a.status in ('pending', 'confirmed') and a.starts_at > now();
  if v_active >= v_cfg.max_active_bookings_per_patient then
    raise exception using errcode = 'P0001', message = 'TOO_MANY_ACTIVE_BOOKINGS';
  end if;

  v_status := case when v_cfg.auto_confirm then 'confirmed'::public.appointment_status
                   else 'pending'::public.appointment_status end;
  v_token := public._new_manage_token();

  for v_slot in
    select s.dentist_id as d_id, s.starts_at as s_at, s.ends_at as e_at
    from public._available_slots(p_location_id, p_service_id, v_day, p_dentist_id, null) s
    where s.starts_at = p_starts_at
    order by (select count(*) from public.appointments a2
              where a2.dentist_id = s.dentist_id
                and a2.status in ('pending', 'confirmed')
                and (a2.starts_at at time zone public.clinic_tz())::date = v_day),
             random()
  loop
    begin
      insert into public.appointments (
        location_id, dentist_id, service_id, patient_id, starts_at, ends_at,
        status, source, patient_notes, confirmed_at, email)
      values (
        p_location_id, v_slot.d_id, p_service_id, v_patient_id, v_slot.s_at, v_slot.e_at,
        v_status, 'online', v_notes,
        case when v_status = 'confirmed' then now() end, v_email)
      returning id into v_id;
      insert into public.appointment_secrets (appointment_id, manage_token) values (v_id, v_token);

      appointment_id := v_id;
      manage_token   := v_token;
      status         := v_status;
      dentist_id     := v_slot.d_id;
      starts_at      := v_slot.s_at;
      ends_at        := v_slot.e_at;
      return next;
      return;
    exception when exclusion_violation then
      continue;   -- lost a race for this dentist; try the next candidate
    end;
  end loop;

  raise exception using errcode = 'P0001', message = 'SLOT_UNAVAILABLE';
end;
$$;

------------------------------------------------------------------------------
-- Staff: walk-in / phone booking (dashboard). Same as 0004, plus an optional e-mail address
-- (empty = use the one saved on the patient, if any).
------------------------------------------------------------------------------
create or replace function public.staff_create_appointment(
  p_location_id    uuid,
  p_service_id     uuid,
  p_dentist_id     uuid,
  p_starts_at      timestamptz,
  p_full_name      text,
  p_phone          text,
  p_source         public.appointment_source default 'phone',
  p_status         public.appointment_status default 'confirmed',
  p_ends_at        timestamptz default null,
  p_internal_notes text default null,
  p_email          text default null
)
returns table (appointment_id uuid, manage_token text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_patient_id uuid;
  v_email      text := public._clean_email(p_email);
  v_token      text;
  v_ends       timestamptz;
  v_id         uuid;
begin
  if not public.can_access_location(p_location_id) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;
  if p_source not in ('phone', 'walk_in', 'admin') then
    raise exception using errcode = 'P0001', message = 'INVALID_SOURCE';
  end if;
  if p_status not in ('pending', 'confirmed') then
    raise exception using errcode = 'P0001', message = 'INVALID_STATUS';
  end if;
  if not exists (select 1 from public.dentists d where d.id = p_dentist_id and d.is_active) then
    raise exception using errcode = 'P0001', message = 'INVALID_DENTIST';
  end if;

  select coalesce(p_ends_at, p_starts_at + make_interval(mins => s.duration_minutes))
    into v_ends
  from public.services s where s.id = p_service_id and s.is_active;
  if v_ends is null then
    raise exception using errcode = 'P0001', message = 'INVALID_SERVICE';
  end if;
  if v_ends <= p_starts_at then
    raise exception using errcode = 'P0001', message = 'INVALID_TIME';
  end if;

  v_patient_id := public._upsert_patient(p_phone, p_full_name, v_email);
  v_token := public._new_manage_token();

  begin
    insert into public.appointments (
      location_id, dentist_id, service_id, patient_id, starts_at, ends_at, status, source,
      internal_notes, confirmed_at, created_by, email)
    values (
      p_location_id, p_dentist_id, p_service_id, v_patient_id, p_starts_at, v_ends, p_status, p_source,
      nullif(btrim(coalesce(p_internal_notes, '')), ''),
      case when p_status = 'confirmed' then now() end, auth.uid(), v_email)
    returning id into v_id;
    insert into public.appointment_secrets (appointment_id, manage_token) values (v_id, v_token);
  exception when exclusion_violation then
    raise exception using errcode = 'P0001', message = 'SLOT_UNAVAILABLE';
  end;

  appointment_id := v_id;
  manage_token   := v_token;
  return next;
end;
$$;

------------------------------------------------------------------------------
-- History tools (0014 / 0015) now point at email_log. 'sms' is still accepted as a synonym.
------------------------------------------------------------------------------
create or replace function public.admin_clear_history(p_what text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count        int := 0;
  v_appointments int := 0;
begin
  if not public.is_owner() then
    raise exception 'Only the clinic owner can clear history' using errcode = '42501';
  end if;

  perform set_config('app.skip_audit', 'on', true);   -- this transaction only

  if p_what in ('emails', 'sms') then
    delete from public.email_log where status not in ('queued', 'sending');
    get diagnostics v_count = row_count;
  elsif p_what = 'patients' then
    -- email_log.appointment_id is "on delete set null" and appointment_secrets cascades.
    delete from public.appointments where true;
    get diagnostics v_appointments = row_count;
    delete from public.patients where true;
    get diagnostics v_count = row_count;
  elsif p_what = 'activity' then
    delete from public.audit_log where true;
    get diagnostics v_count = row_count;
  else
    raise exception 'Unknown history: %', p_what using errcode = '22023';
  end if;

  perform set_config('app.skip_audit', 'off', true);
  insert into public.audit_log (actor_id, actor_type, action, entity, changes)
  values (auth.uid(), 'staff', 'clear_history', p_what,
          jsonb_build_object('deleted', v_count, 'appointments_deleted', v_appointments));

  return jsonb_build_object('deleted', v_count, 'appointments_deleted', v_appointments);
end;
$$;

create or replace function public.admin_delete_history(p_what text, p_ids text[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count        int := 0;
  v_appointments int := 0;
begin
  if not public.is_owner() then
    raise exception 'Only the clinic owner can delete history' using errcode = '42501';
  end if;
  if p_ids is null or cardinality(p_ids) = 0 then
    return jsonb_build_object('deleted', 0, 'appointments_deleted', 0);
  end if;
  if cardinality(p_ids) > 1000 then
    raise exception 'Select at most 1000 rows at a time' using errcode = '22023';
  end if;

  perform set_config('app.skip_audit', 'on', true);   -- this transaction only

  if p_what in ('emails', 'sms') then
    delete from public.email_log
     where id = any (p_ids::uuid[]) and status not in ('queued', 'sending');
    get diagnostics v_count = row_count;
  elsif p_what = 'patients' then
    delete from public.appointments where patient_id = any (p_ids::uuid[]);
    get diagnostics v_appointments = row_count;
    delete from public.patients where id = any (p_ids::uuid[]);
    get diagnostics v_count = row_count;
  elsif p_what = 'activity' then
    delete from public.audit_log where id = any (p_ids::bigint[]);
    get diagnostics v_count = row_count;
  else
    raise exception 'Unknown history: %', p_what using errcode = '22023';
  end if;

  perform set_config('app.skip_audit', 'off', true);
  insert into public.audit_log (actor_id, actor_type, action, entity, changes)
  values (auth.uid(), 'staff', 'delete_selected', p_what,
          jsonb_build_object('deleted', v_count, 'appointments_deleted', v_appointments));

  return jsonb_build_object('deleted', v_count, 'appointments_deleted', v_appointments);
end;
$$;

------------------------------------------------------------------------------
-- Privileges
------------------------------------------------------------------------------
revoke execute on function public._enqueue_appointment_email(uuid, public.email_type), public.appointments_email_events(),
  public.claim_email_batch(int), public.kick_email_worker(), public.email_worker_tick(), public.email_log_after_insert(),
  public._upsert_patient(text, text, text), public._clean_email(text)
  from public, anon, authenticated;
grant execute on function public.claim_email_batch(int), public.kick_email_worker() to service_role;
revoke execute on function public.resend_email(uuid) from public, anon;
grant execute on function public.resend_email(uuid) to authenticated, service_role;
revoke execute on function public.render_template(text, jsonb) from public, anon;
grant execute on function public.render_template(text, jsonb) to authenticated, service_role;

revoke execute on function public.book_appointment(uuid, uuid, uuid, timestamptz, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.book_appointment(uuid, uuid, uuid, timestamptz, text, text, text, text)
  to service_role;
revoke execute on function public.staff_create_appointment(uuid, uuid, uuid, timestamptz, text, text,
  public.appointment_source, public.appointment_status, timestamptz, text, text) from public, anon;
grant execute on function public.staff_create_appointment(uuid, uuid, uuid, timestamptz, text, text,
  public.appointment_source, public.appointment_status, timestamptz, text, text) to authenticated, service_role;

------------------------------------------------------------------------------
-- Schedules: the SMS worker job becomes the e-mail worker job.
------------------------------------------------------------------------------
do $$
begin
  -- Dynamic SQL: the cron schema only exists where pg_cron is installed (not in local PGlite tests).
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    execute $q$select cron.unschedule(jobid) from cron.job where jobname = 'sms-worker'$q$;
    execute $q$select cron.schedule('email-worker', '* * * * *', 'select public.email_worker_tick()')$q$;
  end if;
end $$;
