// POST /functions/v1/send-email   (internal worker — header x-worker-secret required)
// Kicked by pg_net when e-mail rows are queued, and by pg_cron every minute as a safety net.
//   1. claims queued email_log rows (skip-locked, so parallel runs never double-send)
//   2. sends each via Resend (or logs it as dry_run), retrying once on transient errors.
//      The email_log id is the Idempotency-Key, so a retry after a timeout never sends twice.
//   3. polls delivery status for recently sent messages
import { admin } from '../_shared/db.ts';
import { toEmailHtml } from '../_shared/email.ts';
import {
  getEmailStatus, isFinalStatus, sendEmail, type ProviderConfig,
} from '../_shared/providers/resend.ts';

const MAX_ATTEMPTS = 2; // first try + one retry
const RETRY_DELAY_MS = 60_000;

type Row = { id: string; to_email: string; subject: string | null; body: string; attempts: number };

const plain = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return plain(405, { error: 'method not allowed' });
  const secret = Deno.env.get('EMAIL_WORKER_SECRET') ?? '';
  if (!secret || !timingSafeEqual(req.headers.get('x-worker-secret') ?? '', secret)) {
    return plain(401, { error: 'unauthorized' });
  }

  const db = admin();
  const dryRun = (Deno.env.get('EMAIL_DRY_RUN') ?? 'true').trim().toLowerCase() !== 'false'; // safe default
  const cfg: ProviderConfig = {
    apiKey: Deno.env.get('RESEND_API_KEY') ?? '',
    from: Deno.env.get('EMAIL_FROM') ?? '',
    baseUrl: Deno.env.get('RESEND_BASE_URL') || undefined,
  };
  const now = () => new Date().toISOString();
  const stats = { sent: 0, logged: 0, retrying: 0, failed: 0, polled: 0, delivered: 0 };

  // ---- 1+2: send queued ------------------------------------------------------
  const { data: batch, error: claimError } = await db.rpc('claim_email_batch', { p_limit: 25 });
  if (claimError) {
    console.error('claim_email_batch failed', claimError);
    return plain(500, { error: 'claim failed' });
  }

  for (const row of (batch ?? []) as Row[]) {
    const subject = row.subject || 'Roha Dental';
    let update: Record<string, unknown>;

    if (dryRun) {
      console.log(`[DRY_RUN] to=${row.to_email} subject=${subject}\n${row.body}`);
      update = { status: 'dry_run', sent_at: now(), error: null, error_code: null };
      stats.logged++;
    } else if (!cfg.apiKey || !cfg.from) {
      update = { status: 'failed', error_code: 'CONFIG', error: 'RESEND_API_KEY or EMAIL_FROM is not set' };
      stats.failed++;
    } else {
      const r = await sendEmail(cfg, {
        to: row.to_email, subject, text: row.body, html: toEmailHtml(subject, row.body), idempotencyKey: row.id,
      });
      if (r.ok) {
        update = { status: r.status, provider_message_id: r.messageId, sent_at: now(), error: null, error_code: null };
        stats.sent++;
      } else if (r.retryable && row.attempts < MAX_ATTEMPTS) {
        update = {
          status: 'queued',
          next_attempt_at: new Date(Date.now() + RETRY_DELAY_MS).toISOString(),
          error_code: r.code,
          error: `${r.message} (retrying)`,
        };
        stats.retrying++;
      } else {
        update = { status: r.code === 'VALIDATION' ? 'rejected' : 'failed', error_code: r.code, error: r.message };
        stats.failed++;
        console.error(`E-mail ${row.id} failed: ${r.code} ${r.message}`);
      }
    }

    const { error } = await db.from('email_log').update(update).eq('id', row.id);
    if (error) console.error('email_log update failed', row.id, error);
  }

  // ---- 3: delivery status polling ---------------------------------------------
  if (!dryRun && cfg.apiKey) {
    const since = new Date(Date.now() - 24 * 3600_000).toISOString();
    const checkedBefore = new Date(Date.now() - 2 * 60_000).toISOString();
    const { data: open } = await db
      .from('email_log')
      .select('id, provider_message_id')
      .in('status', ['accepted', 'sent'])
      .not('provider_message_id', 'is', null)
      .gte('created_at', since)
      .or(`last_checked_at.is.null,last_checked_at.lt.${checkedBefore}`)
      .order('last_checked_at', { ascending: true, nullsFirst: true })
      .limit(30);

    for (const m of open ?? []) {
      const r = await getEmailStatus(cfg, m.provider_message_id as string);
      const update: Record<string, unknown> = { last_checked_at: now() };
      if (r.ok) {
        update.status = r.status;
        if (r.status === 'delivered') {
          update.delivered_at = now();
          stats.delivered++;
        } else if (isFinalStatus(r.status)) {
          update.error = `Delivery ${r.status}`;
        }
      }
      await db.from('email_log').update(update).eq('id', m.id);
      stats.polled++;
    }
  }

  return plain(200, { ok: true, dryRun, ...stats });
});
