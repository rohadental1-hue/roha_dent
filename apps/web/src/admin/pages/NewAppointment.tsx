import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatEthiopianPhone, normalizeEthiopianPhone } from '@shared/phone.ts';
import { renderTemplate } from '@shared/email.ts';
import { addDays, clinicDateKey, clinicIso, ethiopianTimeOfDay, formatClinicDate, formatEthiopianDate } from '@shared/time.ts';
import { supabase } from '../supabase';
import { useAuth } from '../auth';
import { errorMessage, useLookups } from '../data';
import type { AppointmentSource, AppointmentStatus, EmailTemplate, Patient } from '../types';
import { Card, Choice, EmailPreview, ErrorBox, Field, PageHeader, btn, inputCls, inputInline, useDebounced, useToast } from '../ui';
import { SlotField } from './SlotField';
import { useWriteLocation } from './common';
import { dayName } from './Appointments';

export default function NewAppointmentPage() {
  const auth = useAuth();
  const { data: lk } = useLookups();
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const defaultLocation = useWriteLocation();
  const today = clinicDateKey();

  const [locationId, setLocationId] = useState(defaultLocation ?? '');
  const [serviceId, setServiceId] = useState('');
  const [dentistId, setDentistId] = useState('');
  const [date, setDate] = useState(today);
  const [time, setTime] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [source, setSource] = useState<AppointmentSource>('phone');
  const [status, setStatus] = useState<AppointmentStatus>('confirmed');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const services = (lk?.services ?? []).filter((s) => s.is_active);
  const service = lk?.service(serviceId);
  const dentists = useMemo(() => (locationId && serviceId ? lk?.dentistsFor(locationId, serviceId) ?? [] : []), [lk, locationId, serviceId]);
  useEffect(() => {
    if (dentistId && !dentists.some((d) => d.id === dentistId)) setDentistId('');
    if (!dentistId && dentists.length === 1) setDentistId(dentists[0].id);
  }, [dentists, dentistId]);
  useEffect(() => setTime(''), [dentistId, date, serviceId]);

  // Returning patient: look up by phone and fill in the name and e-mail.
  const parsedPhone = normalizeEthiopianPhone(phone);
  const debouncedPhone = useDebounced(parsedPhone.ok ? parsedPhone.e164 : '', 300);
  const existing = useQuery({
    queryKey: ['patient-by-phone', debouncedPhone],
    enabled: !!debouncedPhone,
    queryFn: async () => {
      const { data, error } = await supabase.from('patients').select('id, full_name, phone, email').eq('phone', debouncedPhone).maybeSingle();
      if (error) throw error;
      return data as Pick<Patient, 'id' | 'full_name' | 'phone' | 'email'> | null;
    },
  });
  useEffect(() => {
    if (existing.data && !name.trim()) setName(existing.data.full_name);
    if (existing.data?.email && !email.trim()) setEmail(existing.data.email);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing.data]);

  // Preview of the email the patient will receive.
  const templates = useQuery({
    queryKey: ['email-templates'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('email_templates').select('key, locale, subject, body, is_active, updated_at').eq('locale', 'en');
      if (error) throw error;
      return data as EmailTemplate[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('staff_create_appointment', {
        p_location_id: locationId,
        p_service_id: serviceId,
        p_dentist_id: dentistId,
        p_starts_at: clinicIso(date, time),
        p_full_name: name.trim(),
        p_phone: parsedPhone.ok ? parsedPhone.e164 : phone,
        p_source: source,
        p_status: status,
        p_internal_notes: notes.trim() || null,
        p_email: email.trim() || null,
      });
      if (error) throw error;
      return (data as { appointment_id: string }[])[0].appointment_id;
    },
    onSuccess: (id) => {
      const first = name.trim().split(' ')[0];
      toast(status !== 'confirmed' ? 'Booked. Confirm it once the time is agreed.'
        : email.trim() ? `Booked! ${first} gets an email now.` : `Booked! No email on file — tell ${first} the time.`);
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['pending-count'] });
      navigate(`/admin?${date === today ? '' : `date=${date}&`}appt=${id}`);
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const phoneError = phone.trim().length >= 4 && !parsedPhone.ok
    ? 'This does not look like a mobile number. Example: 0911 234 567'
    : null;
  const emailOk = !email.trim() || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const missing = [
    !parsedPhone.ok && 'phone number',
    !emailOk && 'a valid email (or leave it empty)',
    name.trim().length < 2 && 'name',
    !serviceId && 'treatment',
    !dentistId && 'dentist',
    !/^\d{2}:\d{2}$/.test(time) && 'time',
  ].filter(Boolean) as string[];
  const ready = missing.length === 0 && !!locationId;

  const emailText = useMemo(() => {
    // Patients only get an email once a booking is confirmed (or cancelled) — migrations 0016/0019.
    if (status !== 'confirmed' || !email.trim()) return null;
    const tpl = templates.data?.find((t) => t.key === 'booking_confirmed');
    if (!tpl || !tpl.is_active || !ready) return null;
    const loc = lk?.location(locationId);
    const vars = {
      patient_name: name.trim().split(' ')[0], patient_full_name: name.trim(), date: serverDate(date),
      time, service: service?.name, location: loc?.city, location_phone: loc?.phone, dentist: lk?.dentist(dentistId)?.full_name,
      manage_link: 'https://rohadent.com/b/…', patient_phone: parsedPhone.ok ? parsedPhone.e164 : '', status,
      local_time: ethiopianTimeOfDay(time), local_date: formatEthiopianDate(date, 'am', false),
    };
    return { subject: renderTemplate(tpl.subject, vars), body: renderTemplate(tpl.body, vars) };
  }, [templates.data, status, email, ready, lk, locationId, name, date, time, service, dentistId, parsedPhone]);

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (ready) create.mutate();
  }

  return (
    <>
      <PageHeader title="New booking" subtitle="For patients who call or come to the front desk. Website bookings arrive by themselves." />
      <form onSubmit={submit} className="grid items-start gap-6 xl:grid-cols-[1fr_24rem]">
        <div className="space-y-6">
          <Card title="Who is the patient?" step={1}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Mobile number" error={phoneError}
                hint={existing.data ? <span className="font-semibold text-emerald-800">✓ Known patient: {existing.data.full_name}</span> : undefined}>
                <input className={`${inputCls} text-lg`} inputMode="tel" autoComplete="off" value={phone} onChange={(e) => setPhone(e.target.value)}
                  aria-invalid={!!phoneError} placeholder="0911 234 567" autoFocus />
              </Field>
              <Field label="Full name">
                <input className={`${inputCls} text-lg`} autoComplete="off" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Abebe Kebede" />
              </Field>
              <Field label="Email (optional)" className="sm:col-span-2" error={emailOk ? null : 'This does not look like an email address.'}
                hint={email.trim() ? 'Confirmations and changes are emailed here.' : 'Without an email the patient gets no messages — tell them the time yourself.'}>
                <input className={inputCls} type="email" inputMode="email" autoComplete="off" maxLength={254} value={email}
                  onChange={(e) => setEmail(e.target.value)} aria-invalid={!emailOk} placeholder="name@example.com" />
              </Field>
            </div>
            <div className="mt-4">
              <Choice label="How are they booking?" value={source} onChange={setSource} options={[
                { value: 'phone', title: 'On the phone' },
                { value: 'walk_in', title: 'At the front desk' },
              ]} />
            </div>
          </Card>

          <Card title="What treatment?" step={2}>
            <div className="grid gap-4 sm:grid-cols-2">
              {auth.isOwner && (lk?.locations.filter((l) => l.is_active).length ?? 0) > 1 && (
                <Field label="Clinic" className="sm:col-span-2">
                  <select className={inputCls} value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                    {lk?.locations.filter((l) => l.is_active).map((l) => <option key={l.id} value={l.id}>{l.city}</option>)}
                  </select>
                </Field>
              )}
              <Field label="Treatment">
                <select className={inputCls} value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
                  <option value="">Choose a treatment…</option>
                  {services.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.duration_minutes} min)</option>)}
                </select>
              </Field>
              <Field label="Dentist" error={serviceId && dentists.length === 0 ? 'No dentist at this clinic offers this treatment. Check “Dentists & services”.' : null}>
                <select className={inputCls} value={dentistId} onChange={(e) => setDentistId(e.target.value)} disabled={!serviceId}>
                  <option value="">{serviceId ? 'Choose a dentist…' : 'Choose the treatment first'}</option>
                  {dentists.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                </select>
              </Field>
            </div>
          </Card>

          <Card title="When?" step={3}>
            <div className="mb-5 flex flex-wrap items-center gap-2">
              {[0, 1, 2].map((n) => {
                const d = addDays(today, n);
                return (
                  <button key={n} type="button" onClick={() => setDate(d)}
                    className={date === d ? btn.primary : btn.ghost}>{dayName(d)}</button>
                );
              })}
              <label className="flex items-center gap-2">
                <span className="text-ink-soft">or</span>
                <input type="date" className={`${inputInline} w-auto`} value={date} min={today} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Other day" />
              </label>
            </div>
            <p className="mb-3 font-semibold text-roha-900">{formatClinicDate(date)} <span className="font-normal text-roha-500">· {formatEthiopianDate(date)}</span></p>
            {locationId && serviceId ? (
              <SlotField locationId={locationId} serviceId={serviceId} dentistId={dentistId} date={date} time={time} onTime={setTime} />
            ) : (
              <p className="text-ink-soft">Choose the treatment and dentist first — then the free times appear here.</p>
            )}
          </Card>
        </div>

        <div className="space-y-6 xl:sticky xl:top-6">
          <Card title="Check and book" step={4}>
            <dl className="space-y-2">
              <Row label="Patient" value={name.trim() ? `${name.trim()}${parsedPhone.ok ? ` · ${formatEthiopianPhone(parsedPhone.e164)}` : ''}` : undefined} />
              <Row label="Treatment" value={service ? `${service.name} (${service.duration_minutes} min)` : undefined} />
              <Row label="Dentist" value={lk?.dentist(dentistId)?.full_name} />
              <Row label="When" value={time ? `${dayName(date)}, ${formatClinicDate(date, 'en-GB', false)} at ${time} (${ethiopianTimeOfDay(time)} local)` : undefined} />
            </dl>

            <div className="mt-5">
              <Choice label="Booking status" value={status} onChange={setStatus} options={[
                { value: 'confirmed', title: 'Confirmed', text: 'The time is agreed.' },
                { value: 'pending', title: 'Confirm later', text: 'Still needs a call-back. No email is sent until you confirm.' },
              ]} />
            </div>

            <div className="mt-4">
              <Field label="Notes for the team (optional)">
                <textarea className={`${inputCls} min-h-20`} maxLength={4000} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </Field>
            </div>

            {emailText && (
              <div className="mt-4 text-sm">
                <p className="mb-1 font-semibold">The patient will get this email:</p>
                <EmailPreview subject={emailText.subject} body={emailText.body} />
              </div>
            )}

            {error && <div className="mt-4"><ErrorBox error={error} /></div>}
            <button type="submit" className="btn-primary mt-5 min-h-13 w-full text-lg disabled:opacity-50" disabled={!ready || create.isPending}>
              {create.isPending ? 'Booking…' : 'Book appointment'}
            </button>
            {!ready && <p className="mt-2 text-sm text-ink-soft">Still missing: {missing.join(', ')}.</p>}
          </Card>
        </div>
      </form>
    </>
  );
}

/** Same format the server uses in emails ('Dy FMDD Mon'), e.g. 'Sat 7 Nov'. */
function serverDate(key: string) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Addis_Ababa', weekday: 'short', day: 'numeric', month: 'short' })
    .format(new Date(`${key}T12:00:00+03:00`)).replace(',', '');
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="grid grid-cols-[6rem_1fr] gap-2">
      <dt className="text-ink-soft">{label}</dt>
      <dd className={value ? 'font-semibold' : 'text-ink-soft/70'}>{value ?? '—'}</dd>
    </div>
  );
}
