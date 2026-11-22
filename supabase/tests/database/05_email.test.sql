-- E-mail outbox: which events queue which messages, rendering, worker claim, resend.
-- Note: the e-mail trigger is DEFERRED (fires at commit). Inside this single test transaction we
-- flush pending deferred triggers before assertions with `set constraints all immediate` (then defer again).
begin;
select plan(24);


create temp table ctx as
select d::date as tuesday,
       (select id from public.locations where slug = 'addis-ababa') as addis,
       (select id from public.locations where slug = 'gonder')      as gonder,
       (select id from public.services  where slug = 'scaling')     as scaling,
       (select id from public.dentists  where slug = 'dr-selam-bekele')  as selam,
       (select id from public.dentists  where slug = 'dr-meron-tadesse') as meron
from generate_series((now() at time zone 'Africa/Addis_Ababa')::date + 3,
                     (now() at time zone 'Africa/Addis_Ababa')::date + 9, interval '1 day') d
where extract(dow from d) = 2
limit 1;

create function pg_temp.at(t time) returns timestamptz language sql as $$
  select ((select tuesday from ctx) + t) at time zone 'Africa/Addis_Ababa'
$$;
create function pg_temp.mails(p_appt uuid, p_type text) returns int language sql as $$
  select count(*)::int from public.email_log where appointment_id = p_appt and type::text = p_type
$$;
create function pg_temp.body(p_appt uuid, p_type text) returns text language sql as $$
  select body from public.email_log where appointment_id = p_appt and type::text = p_type order by created_at desc limit 1
$$;

------------------------------------------------------------------------------
-- Online booking → nothing yet (the patient hears from us once staff confirm or cancel),
-- and no clinic alert any more
------------------------------------------------------------------------------
create temp table b1 as
select x.* from ctx, public.book_appointment(ctx.addis, ctx.scaling, ctx.selam, pg_temp.at('09:00'), 'Abebe Kebede', '+251911000001',
                                             null, 'Abebe@Example.com') x;

set constraints all immediate; set constraints all deferred;
select is((select count(*)::int from public.email_log where appointment_id = (select appointment_id from b1)),
          0, 'online booking sends nothing yet (no patient mail, no clinic alert)');
select is((select email from public.appointments where id = (select appointment_id from b1)), 'abebe@example.com',
          'the booking keeps the e-mail address (lower-case)');

-- Moving a still-pending booking sends nothing either (the confirmation carries the time)
update public.appointments set starts_at = pg_temp.at('09:30') where id = (select appointment_id from b1);
set constraints all immediate; set constraints all deferred;
select is(pg_temp.mails((select appointment_id from b1), 'booking_rescheduled'), 0, 'moving a pending booking sends nothing');
update public.appointments set starts_at = pg_temp.at('09:00') where id = (select appointment_id from b1);

------------------------------------------------------------------------------
-- Lifecycle
------------------------------------------------------------------------------
update public.appointments set status = 'confirmed' where id = (select appointment_id from b1);
set constraints all immediate; set constraints all deferred;
select is(pg_temp.mails((select appointment_id from b1), 'booking_confirmed'), 1, 'pending → confirmed queues "confirmed"');
select is((select to_email || ' / ' || status from public.email_log where appointment_id = (select appointment_id from b1) and type = 'booking_confirmed'),
          'abebe@example.com / queued', '… to the patient, queued');
select ok((select subject from public.email_log where appointment_id = (select appointment_id from b1) and type = 'booking_confirmed')
          like 'Your appointment is confirmed: % at 09:00', 'subject is rendered');
select ok(pg_temp.body((select appointment_id from b1), 'booking_confirmed') like 'Hi Abebe,%', 'patient_name renders as first name');
select ok(pg_temp.body((select appointment_id from b1), 'booking_confirmed') like '%https://rohadent.com/b/' || (select manage_token from b1) || '%',
          'full manage_link contains the token');
select ok(pg_temp.body((select appointment_id from b1), 'booking_confirmed') like '%Time: 09:00 (%', 'time renders in clinic time (24h)');
select ok(pg_temp.body((select appointment_id from b1), 'booking_confirmed') !~ '\{[a-z_]+\}', 'no unrendered placeholders');

update public.appointments set starts_at = pg_temp.at('10:00') where id = (select appointment_id from b1);
set constraints all immediate; set constraints all deferred;
select is(pg_temp.mails((select appointment_id from b1), 'booking_rescheduled'), 1, 'time change queues "rescheduled"');
select ok(pg_temp.body((select appointment_id from b1), 'booking_rescheduled') like '%New time: 10:00%', '… with the new time');

update public.appointments set internal_notes = 'x' where id = (select appointment_id from b1);
set constraints all immediate; set constraints all deferred;
select is((select count(*)::int from public.email_log where appointment_id = (select appointment_id from b1)), 2,
          'notes-only edit sends nothing');

update public.appointments set status = 'cancelled' where id = (select appointment_id from b1);
set constraints all immediate; set constraints all deferred;
select is(pg_temp.mails((select appointment_id from b1), 'booking_cancelled'), 1, 'cancel queues "cancelled"');

------------------------------------------------------------------------------
-- Staff bookings: with and without an e-mail address
------------------------------------------------------------------------------
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000d1', 'owner@test.local');
insert into public.profiles (id, full_name, role) values ('00000000-0000-0000-0000-0000000000d1', 'Owner', 'owner');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1"}', true);
create temp table b2 as
select x.* from ctx, public.staff_create_appointment(ctx.gonder, ctx.scaling, ctx.meron, pg_temp.at('11:00'), 'Tigist Haile', '+251911000002',
                                                     'phone', p_email => 'tigist@example.com') x;
create temp table b3 as
select x.* from ctx, public.staff_create_appointment(ctx.gonder, ctx.scaling, ctx.meron, pg_temp.at('13:00'), 'Walk In', '+251711000003', 'walk_in') x;
select set_config('request.jwt.claims', '', true);
set constraints all immediate; set constraints all deferred;
select is((select to_email || ' / ' || status from public.email_log where appointment_id = (select appointment_id from b2) and type = 'booking_confirmed'),
          'tigist@example.com / queued', 'staff phone booking with e-mail queues "confirmed"');
select is((select status::text || ' / ' || error from public.email_log where appointment_id = (select appointment_id from b3) and type = 'booking_confirmed'),
          'skipped / Patient has no email address', 'walk-in without e-mail is logged as skipped, never silent');
select is((select count(*)::int from public.email_log where type = 'clinic_new_booking'), 0, 'no clinic alerts at all');

-- E-mail switched off → rows are still logged, as skipped with a reason
update public.settings set email_enabled = false;
update public.appointments set status = 'cancelled' where id = (select appointment_id from b2);
set constraints all immediate; set constraints all deferred;
select is((select status::text || ' / ' || error from public.email_log where appointment_id = (select appointment_id from b2) and type = 'booking_cancelled'),
          'skipped / E-mail is turned off in settings', 'disabled e-mail is logged as skipped, never silent');
update public.settings set email_enabled = true;

------------------------------------------------------------------------------
-- Worker claim + resend
------------------------------------------------------------------------------
select ok((select count(*) from public.claim_email_batch(100)) > 0, 'worker claims queued rows');
select is((select count(*)::int from public.claim_email_batch(100)), 0, 'claimed rows are not handed out twice');

select lives_ok($$select public.resend_email((select id from public.email_log where appointment_id = (select appointment_id from b1) limit 1))$$,
                'postgres/service can resend');
select is((select count(*)::int from public.email_log where resend_of is not null and status = 'queued'), 1, 'the resend is queued');
select throws_ok($$select public.resend_email((select id from public.email_log where appointment_id = (select appointment_id from b3) limit 1))$$,
                 'P0001', 'NO_EMAIL', 'resending to a patient without e-mail is refused');
select is(public.render_template('Hi {a}, {b}', '{"a":"X"}'::jsonb), 'Hi X, {b}', 'render_template replaces known placeholders only');

select * from finish();
rollback;
