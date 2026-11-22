import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatEthiopianPhone } from '@shared/phone.ts';
import { supabase } from '../supabase';
import { useAuth } from '../auth';
import { errorMessage, useLookups } from '../data';
import { EMAIL_ERROR_HELP, EMAIL_TYPES, EMAIL_TYPE_LABEL, emailState, recipientLabel, type EmailRow, type EmailStatus, type EmailType } from '../types';
import { EMAIL_PROBLEM, EmailBadge, Empty, ErrorBox, Loading, PageHeader, Tip, btn, fmtDateTime, inputInline, useConfirm, useOpenAppointment, useToast } from '../ui';
import { ScopeSelect } from './common';
import { ClearHistoryButton, RowCheck, SelectionBar, useSelection } from './ClearHistory';

const GROUPS: Record<string, { label: string; statuses?: EmailStatus[] }> = {
  all: { label: 'All emails' },
  problems: { label: 'Problems', statuses: EMAIL_PROBLEM },
  pending: { label: 'On the way', statuses: ['queued', 'sending', 'accepted', 'sent'] },
  delivered: { label: 'Delivered', statuses: ['delivered'] },
};
const PAGE = 100;

export default function EmailLogPage() {
  const auth = useAuth();
  const { data: lk } = useLookups();
  const toast = useToast();
  const ask = useConfirm();
  const qc = useQueryClient();
  const sel = useSelection();
  const open = useOpenAppointment();
  const [group, setGroup] = useState('all');
  const [type, setType] = useState<EmailType | ''>('');
  const [limit, setLimit] = useState(PAGE);

  const q = useQuery({
    queryKey: ['emails', group, type, auth.scope, limit],
    queryFn: async () => {
      let query = supabase.from('email_log')
        .select('id, appointment_id, location_id, type, to_email, subject, body, provider, status, error_code, error, attempts, resend_of, sent_at, delivered_at, created_at')
        .order('created_at', { ascending: false }).limit(limit);
      const st = GROUPS[group].statuses;
      if (st) query = query.in('status', st);
      if (type) query = query.eq('type', type);
      if (auth.scope) query = query.eq('location_id', auth.scope);
      const { data, error } = await query;
      if (error) throw error;
      return data as EmailRow[];
    },
  });

  const stats = useQuery({
    queryKey: ['emails', 'stats', auth.scope],
    queryFn: async () => {
      let query = supabase.from('email_log').select('status').gte('created_at', new Date(Date.now() - 86400_000).toISOString()).limit(5000);
      if (auth.scope) query = query.eq('location_id', auth.scope);
      const { data, error } = await query;
      if (error) throw error;
      const rows = data as { status: EmailStatus }[];
      return {
        total: rows.filter((r) => r.status !== 'skipped' && r.status !== 'dry_run').length,
        problems: rows.filter((r) => EMAIL_PROBLEM.includes(r.status)).length,
        delivered: rows.filter((r) => r.status === 'delivered').length,
      };
    },
  });

  const resend = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('resend_email', { p_email_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast('The email will be sent again in a moment');
      qc.invalidateQueries({ queryKey: ['emails'] });
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });

  return (
    <>
      <PageHeader title="Emails" subtitle="Every email the system sends to patients. They go out automatically." actions={<><ScopeSelect /><ClearHistoryButton kind="emails" /></>} />

      {stats.data && (
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <StatBox label="Sent in the last 24 hours" value={stats.data.total} />
          <StatBox label="Delivered" value={stats.data.delivered} />
          <StatBox label="Problems" value={stats.data.problems} bad={stats.data.problems > 0} onClick={() => setGroup('problems')} />
        </div>
      )}

      {group === 'problems' && (
        <div className="mb-5">
          <Tip tone="warn">
            <p>These emails did not reach the patient. <b>Call the patient</b> so they know about their appointment. When the problem is fixed you can press “Send again”.</p>
          </Tip>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {Object.entries(GROUPS).map(([k, g]) => (
          <button key={k} type="button" aria-pressed={group === k} onClick={() => { setGroup(k); setLimit(PAGE); }}
            className={`min-h-10 rounded-full border-2 px-4 font-semibold ${group === k ? 'border-roha-700 bg-roha-700 text-white' : 'border-line bg-white text-roha-800 hover:border-roha-300'}`}>
            {g.label}
          </button>
        ))}
        <select className={`${inputInline} ml-auto w-auto`} value={type} aria-label="Kind of email" onChange={(e) => setType(e.target.value as EmailType | '')}>
          <option value="">All kinds</option>
          {EMAIL_TYPES.map((t) => <option key={t} value={t}>{EMAIL_TYPE_LABEL[t]}</option>)}
        </select>
      </div>

      {q.isError ? (
        <ErrorBox error={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : q.isPending ? (
        <Loading />
      ) : q.data.length === 0 ? (
        <Empty icon="message">{group === 'problems' ? 'No problems — every email went through.' : 'No emails here yet.'}</Empty>
      ) : (
        <>
        <SelectionBar kind="emails" sel={sel} shownIds={q.data.filter((m) => m.status !== 'queued' && m.status !== 'sending').map((m) => m.id)} />
        <ul className="space-y-2">
          {q.data.map((m) => {
            const st = emailState(m.status);
            return (
              <li key={m.id} className={`rounded-xl border bg-white px-4 py-3 ${st.tone === 'bad' ? 'border-red-200' : 'border-line'}`}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {m.status !== 'queued' && m.status !== 'sending' && <RowCheck sel={sel} id={m.id} label={`email to ${recipientLabel(m, formatEthiopianPhone)}`} />}
                  <span className="font-semibold">{EMAIL_TYPE_LABEL[m.type]}{m.resend_of ? ' (sent again)' : ''}</span>
                  <EmailBadge status={m.status} />
                  <span className="break-all text-ink-soft">to {recipientLabel(m, formatEthiopianPhone)}</span>
                  {!auth.scope && m.location_id && <span className="text-sm text-ink-soft">· {lk?.location(m.location_id)?.city}</span>}
                  <span className="ml-auto text-sm text-ink-soft tabular-nums">{fmtDateTime(m.created_at)}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <details className="text-sm">
                    <summary className="cursor-pointer text-roha-700">Show the email</summary>
                    <div className="mt-1 max-w-2xl rounded-lg bg-enamel p-3 text-ink-soft">
                      {m.subject && <p className="mb-2 font-semibold text-ink">{m.subject}</p>}
                      <p className="whitespace-pre-wrap">{m.body}</p>
                    </div>
                  </details>
                  {m.appointment_id && <button type="button" className="text-sm font-semibold text-roha-700 hover:underline" onClick={() => open(m.appointment_id!)}>Open the booking ›</button>}
                </div>
                {st.tone === 'bad' && (
                  <p className="mt-1.5 text-red-800">{(m.error_code && EMAIL_ERROR_HELP[m.error_code]) || m.error || st.help}</p>
                )}
                {(st.tone === 'bad' || st.tone === 'off') && (
                  <div className="mt-2">
                    <button type="button" className={btn.small} disabled={resend.isPending}
                      onClick={async () => {
                        if (await ask({ title: 'Send this email again?', text: 'The same email goes to the patient’s current e-mail address again.', yes: 'Send again' })) resend.mutate(m.id);
                      }}>Send again</button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        </>
      )}
      {q.data?.length === limit && (
        <button type="button" className={`${btn.ghost} mt-3`} onClick={() => setLimit((l) => l + PAGE)}>Show older emails</button>
      )}
    </>
  );
}

function StatBox({ label, value, bad, onClick }: { label: string; value: number; bad?: boolean; onClick?: () => void }) {
  const cls = `rounded-xl border px-5 py-4 text-left ${bad ? 'border-red-200 bg-red-50' : 'border-line bg-white'}`;
  const inner = (
    <>
      <p className={`text-sm ${bad ? 'text-red-800' : 'text-ink-soft'}`}>{label}</p>
      <p className={`text-3xl font-bold tabular-nums ${bad ? 'text-red-700' : 'text-roha-900'}`}>{value}</p>
      {bad && <p className="text-sm font-semibold text-red-800">Show problems →</p>}
    </>
  );
  return onClick && bad ? <button type="button" className={cls} onClick={onClick}>{inner}</button> : <div className={cls}>{inner}</div>;
}
