import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SAMPLE_VARS, TEMPLATE_PLACEHOLDERS, renderTemplate } from '@shared/email.ts';
import { supabase } from '../supabase';
import { useAuth } from '../auth';
import { errorMessage } from '../data';
import { EMAIL_TYPES, EMAIL_TYPE_LABEL, type EmailTemplate, type EmailType, type Settings } from '../types';
import { Card, EmailPreview, ErrorBox, Field, Loading, PageHeader, Toggle, btn, fmtDateTime, inputCls, useToast } from '../ui';

const PLACEHOLDER_LABEL: Record<(typeof TEMPLATE_PLACEHOLDERS)[number], string> = {
  patient_name: 'First name',
  patient_full_name: 'Full name',
  date: 'Date',
  time: 'Time',
  service: 'Treatment',
  location: 'Clinic',
  dentist: 'Dentist',
  location_phone: 'Clinic phone',
  manage_link: 'Change/cancel link',
  patient_phone: 'Patient phone',
  status: 'Status',
  local_time: 'Local time (ጠዋት…)',
  local_date: 'Ethiopian date',
};

const EMAIL_HINT: Partial<Record<EmailType, string>> = {
  booking_confirmed: 'Sent when staff confirm a booking, or when a booking is created as confirmed. Patients get no email before this.',
  booking_cancelled: 'Sent when a booking is cancelled (by staff or by the patient’s link).',
  booking_rescheduled: 'Sent when the time of a confirmed booking changes.',
};

export default function SettingsPage() {
  const auth = useAuth();
  return (
    <>
      <PageHeader title={auth.isOwner ? 'Settings & email texts' : 'Email texts & booking rules'} subtitle={auth.isOwner ? 'How online booking works and what the emails say.' : 'Only the clinic owner can change these.'} />
      <div className="space-y-6">
        <SettingsForm readOnly={!auth.isOwner} />
        <Templates readOnly={!auth.isOwner} />
      </div>
    </>
  );
}

// ---- settings ---------------------------------------------------------------------------

function SettingsForm({ readOnly }: { readOnly: boolean }) {
  const toast = useToast();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('settings').select('*').single();
      if (error) throw error;
      return data as Settings;
    },
  });
  const [s, setS] = useState<Settings | null>(null);
  useEffect(() => {
    if (q.data) setS(q.data);
  }, [q.data]);

  const save = useMutation({
    mutationFn: async (patch: Partial<Settings>) => {
      const { error } = await supabase.from('settings').update(patch).eq('id', true);
      if (error) throw error;
    },
    onSuccess: () => {
      toast('Settings saved');
      qc.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });

  if (q.isError) return <ErrorBox error={errorMessage(q.error)} onRetry={() => q.refetch()} />;
  if (!s) return <Loading />;

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS({ ...s, [k]: v });
  const num = (k: keyof Settings, v: string) => set(k, Number(v) as never);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!s) return;
    save.mutate({
      auto_confirm: s.auto_confirm,
      slot_interval_minutes: s.slot_interval_minutes,
      min_lead_minutes: s.min_lead_minutes,
      max_advance_days: s.max_advance_days,
      cancel_cutoff_minutes: s.cancel_cutoff_minutes,
      max_reschedules: s.max_reschedules,
      max_active_bookings_per_patient: s.max_active_bookings_per_patient,
      email_enabled: s.email_enabled,
      public_site_url: s.public_site_url.trim().replace(/\/$/, ''),
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-2">
      <Card title="Online booking rules">
        <fieldset disabled={readOnly} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Toggle checked={s.auto_confirm} onChange={(v) => set('auto_confirm', v)} label="Confirm website bookings automatically" />
            <p className="mt-1 text-xs text-ink-soft">Recommended: leave this off. Then website bookings wait in “Requests to confirm” until staff call the patient.</p>
          </div>
          <Field label="Shortest notice for website bookings" hint="Patients cannot book online sooner than this.">
            <select className={inputCls} value={s.min_lead_minutes} onChange={(e) => num('min_lead_minutes', e.target.value)}>
              {[0, 30, 60, 120, 180, 240, 720, 1440].map((m) => <option key={m} value={m}>{m === 0 ? 'Any time' : m < 60 ? `${m} min` : `${m / 60} h`}</option>)}
            </select>
          </Field>
          <Field label="How far ahead patients can book (days)">
            <input type="number" min={1} max={365} className={inputCls} value={s.max_advance_days} onChange={(e) => num('max_advance_days', e.target.value)} />
          </Field>
          <Field label="Start times offered online" hint="e.g. every 15 min → 08:30, 08:45, 09:00…">
            <select className={inputCls} value={s.slot_interval_minutes} onChange={(e) => num('slot_interval_minutes', e.target.value)}>
              {[5, 10, 15, 20, 30, 60].map((m) => <option key={m} value={m}>every {m} min</option>)}
            </select>
          </Field>
          <Field label="Patients can cancel or change until" hint="Using the link in their email.">
            <select className={inputCls} value={s.cancel_cutoff_minutes} onChange={(e) => num('cancel_cutoff_minutes', e.target.value)}>
              {[0, 60, 120, 240, 720, 1440, 2880].map((m) => <option key={m} value={m}>{m === 0 ? 'Up to the start' : `${m / 60} h before`}</option>)}
            </select>
          </Field>
          <Field label="Times a patient may change one booking">
            <input type="number" min={0} max={20} className={inputCls} value={s.max_reschedules} onChange={(e) => num('max_reschedules', e.target.value)} />
          </Field>
          <Field label="Upcoming bookings allowed per patient">
            <input type="number" min={1} max={50} className={inputCls} value={s.max_active_bookings_per_patient} onChange={(e) => num('max_active_bookings_per_patient', e.target.value)} />
          </Field>
        </fieldset>
      </Card>

      <Card title="Emails">
        <fieldset disabled={readOnly} className="space-y-4">
          <Toggle checked={s.email_enabled} onChange={(v) => set('email_enabled', v)} label="Send emails to patients (switch off to stop all emails)" />
          <Field label="Website address" hint="Used for the “change or cancel” link in the emails. Normally https://rohadent.com">
            <input type="url" className={inputCls} value={s.public_site_url} onChange={(e) => set('public_site_url', e.target.value)} />
          </Field>
        </fieldset>
        {!readOnly && (
          <div className="mt-6 flex items-center gap-3">
            <button type="submit" className={btn.primary} disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save settings'}</button>
            <span className="text-xs text-ink-soft">Last change {fmtDateTime(s.updated_at)}</span>
          </div>
        )}
      </Card>
    </form>
  );
}

// ---- templates --------------------------------------------------------------------------

function Templates({ readOnly }: { readOnly: boolean }) {
  const q = useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('email_templates').select('key, locale, subject, body, is_active, updated_at').eq('locale', 'en');
      if (error) throw error;
      return data as EmailTemplate[];
    },
  });
  if (q.isError) return <ErrorBox error={errorMessage(q.error)} onRetry={() => q.refetch()} />;
  if (q.isPending) return <Loading />;
  const byKey = new Map(q.data.map((t) => [t.key, t]));

  return (
    <Card title="What the emails say">
      <p className="mb-4 text-sm text-ink-soft">
        Each email is filled in with the patient’s details automatically — below each one you see an example. Links in the text
        become clickable, and the email gets the Roha header and footer.
      </p>
      <div className="grid gap-5 xl:grid-cols-2">
        {EMAIL_TYPES.map((k) => <TemplateEditor key={k} type={k} tpl={byKey.get(k)} readOnly={readOnly} />)}
      </div>
    </Card>
  );
}

function TemplateEditor({ type, tpl, readOnly }: { type: EmailType; tpl: EmailTemplate | undefined; readOnly: boolean }) {
  const toast = useToast();
  const qc = useQueryClient();
  const ref = useRef<HTMLTextAreaElement>(null);
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState(tpl?.subject ?? '');
  const [body, setBody] = useState(tpl?.body ?? '');
  const [active, setActive] = useState(tpl?.is_active ?? true);
  useEffect(() => {
    setSubject(tpl?.subject ?? '');
    setBody(tpl?.body ?? '');
    setActive(tpl?.is_active ?? true);
  }, [tpl]);

  const preview = renderTemplate(body, SAMPLE_VARS);
  const previewSubject = renderTemplate(subject, SAMPLE_VARS);
  const unknown = [...`${subject} ${body}`.matchAll(/\{([a-z_]+)\}/g)].map((m) => m[1]).filter((k) => !(TEMPLATE_PLACEHOLDERS as readonly string[]).includes(k));
  const dirty = subject !== (tpl?.subject ?? '') || body !== (tpl?.body ?? '') || active !== (tpl?.is_active ?? true);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('email_templates').upsert({ key: type, locale: 'en', subject: subject.trim(), body: body.trim(), is_active: active });
      if (error) throw error;
    },
    onSuccess: () => {
      setEditing(false);
      toast(`“${EMAIL_TYPE_LABEL[type]}” email saved`);
      qc.invalidateQueries({ queryKey: ['email-templates'] });
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });

  function insert(ph: string) {
    const el = ref.current;
    const token = `{${ph}}`;
    if (!el) return setBody((b) => b + token);
    const { selectionStart: s, selectionEnd: e } = el;
    const next = body.slice(0, s) + token + body.slice(e);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + token.length, s + token.length);
    });
  }

  return (
    <div className={`rounded-xl border p-4 ${active ? 'border-line bg-white' : 'border-dashed border-line bg-enamel'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg">{EMAIL_TYPE_LABEL[type]}</h3>
        <Toggle checked={active} onChange={(v) => { setActive(v); if (!readOnly) setEditing(true); }} disabled={readOnly} label={active ? 'Sent' : 'Not sent'} />
      </div>
      <p className="mb-3 text-sm text-ink-soft">{EMAIL_HINT[type]}</p>

      <EmailPreview subject={previewSubject} body={preview} />

      {!readOnly && !editing && (
        <button type="button" className={`${btn.small} mt-3`} onClick={() => setEditing(true)}>Edit text</button>
      )}

      {!readOnly && editing && (
        <div className="mt-3 space-y-2">
          <input className={inputCls} value={subject} maxLength={200} onChange={(e) => setSubject(e.target.value)}
            aria-label={`${EMAIL_TYPE_LABEL[type]} subject`} placeholder="Subject" />
          <textarea ref={ref} className={`${inputCls} min-h-48`} value={body} maxLength={5000}
            onChange={(e) => setBody(e.target.value)} aria-label={`${EMAIL_TYPE_LABEL[type]} text`} />
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm text-ink-soft">Insert:</span>
            {TEMPLATE_PLACEHOLDERS.map((ph) => (
              <button key={ph} type="button" title={`Adds {${ph}}`}
                className="rounded-md border border-roha-200 bg-white px-2 py-1 text-sm text-roha-800 hover:bg-roha-50" onClick={() => insert(ph)}>
                + {PLACEHOLDER_LABEL[ph]}
              </button>
            ))}
          </div>
          <p className="text-xs text-ink-soft">Words in {'{curly brackets}'} are filled in automatically. Don’t change what is inside the brackets.</p>
          {unknown.length > 0 && <p className="text-sm text-red-700">Unknown: {unknown.map((u) => `{${u}}`).join(', ')} — this will be sent exactly as typed.</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btn.primary} disabled={save.isPending || !body.trim() || !subject.trim() || !dirty} onClick={() => save.mutate()}>Save</button>
            <button type="button" className={btn.ghost} onClick={() => { setSubject(tpl?.subject ?? ''); setBody(tpl?.body ?? ''); setActive(tpl?.is_active ?? true); setEditing(false); }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

