// Resend adapter — the ONLY file that knows the e-mail provider's API.
// Docs: https://resend.com/docs/api-reference
//
//   POST {base}/emails        headers: Authorization: Bearer <key>, Idempotency-Key: <email_log id>
//        body: {"from","to":[…],"subject","html","text"}            → 200 {"id":"4ef9…"}
//   GET  {base}/emails/{id}   → {"id", "last_event":"delivered", …}
//   Errors: {"statusCode":422,"name":"validation_error","message":"…"} — 400/422 bad input, 401/403 key,
//           404, 409 idempotency conflict, 429 rate limit, 5xx
//   last_event: queued scheduled sent delivered delivery_delayed bounced complained opened clicked failed canceled

export type ProviderConfig = {
  apiKey: string;
  from: string;
  baseUrl?: string;
  timeoutMs?: number;
  fetch?: typeof fetch; // injectable for tests
};

export type DeliveryStatus = 'sent' | 'delivered' | 'bounced' | 'complained' | 'failed';

export type ProviderFailure = {
  ok: false;
  retryable: boolean;
  /** One of: VALIDATION AUTH NOT_FOUND RATE_LIMITED SERVER NETWORK BAD_RESPONSE */
  code: string;
  message: string;
  httpStatus: number | null;
};
export type SendSuccess = { ok: true; messageId: string; status: DeliveryStatus };
export type StatusSuccess = { ok: true; status: DeliveryStatus };

export type EmailMessage = { to: string; subject: string; html: string; text: string; idempotencyKey?: string };

export function mapProviderStatus(s: unknown): DeliveryStatus {
  switch (String(s ?? '').toLowerCase()) {
    case 'delivered':
    case 'opened':
    case 'clicked': return 'delivered';
    case 'bounced': return 'bounced';
    case 'complained': return 'complained';
    case 'failed':
    case 'canceled': return 'failed';
    default: return 'sent'; // queued, scheduled, sent, delivery_delayed, unknown
  }
}

export function isFinalStatus(s: DeliveryStatus): boolean {
  return s !== 'sent';
}

export function parseProviderError(httpStatus: number, body: unknown): ProviderFailure {
  const b = (body ?? {}) as Record<string, unknown>;
  const msg = typeof b.message === 'string' ? b.message : undefined;
  if (httpStatus === 400 || httpStatus === 422)
    return { ok: false, retryable: false, code: 'VALIDATION', message: msg ?? 'The e-mail was refused (bad address or content)', httpStatus };
  if (httpStatus === 401 || httpStatus === 403)
    return { ok: false, retryable: false, code: 'AUTH', message: msg ?? 'API key missing or invalid, or sender domain not verified', httpStatus };
  if (httpStatus === 404) return { ok: false, retryable: false, code: 'NOT_FOUND', message: 'Not found', httpStatus };
  if (httpStatus === 429) return { ok: false, retryable: true, code: 'RATE_LIMITED', message: msg ?? 'Provider rate limit', httpStatus };
  return { ok: false, retryable: httpStatus >= 500, code: 'SERVER', message: msg ?? `Provider HTTP ${httpStatus}`, httpStatus };
}

async function call(
  cfg: ProviderConfig, path: string, init: RequestInit & { headers?: Record<string, string> },
): Promise<{ status: number; body: unknown } | ProviderFailure> {
  const f = cfg.fetch ?? fetch;
  try {
    const res = await f(`${(cfg.baseUrl ?? 'https://api.resend.com').replace(/\/$/, '')}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(init.headers ?? {}),
      },
      signal: AbortSignal.timeout(cfg.timeoutMs ?? 15_000),
    });
    const text = await res.text();
    let body: unknown;
    try { body = text ? JSON.parse(text) : undefined; } catch { body = { raw: text.slice(0, 300) }; }
    return { status: res.status, body };
  } catch (e) {
    return { ok: false, retryable: true, code: 'NETWORK', message: e instanceof Error ? e.message : String(e), httpStatus: null };
  }
}

export async function sendEmail(cfg: ProviderConfig, m: EmailMessage): Promise<SendSuccess | ProviderFailure> {
  const r = await call(cfg, '/emails', {
    method: 'POST',
    headers: m.idempotencyKey ? { 'Idempotency-Key': m.idempotencyKey } : {},
    body: JSON.stringify({ from: cfg.from, to: [m.to], subject: m.subject, html: m.html, text: m.text }),
  });
  if ('ok' in r) return r;
  if (r.status < 200 || r.status >= 300) return parseProviderError(r.status, r.body);
  const b = (r.body ?? {}) as Record<string, unknown>;
  if (typeof b.id !== 'string' || !b.id) {
    return { ok: false, retryable: false, code: 'BAD_RESPONSE', message: 'Provider did not return a message id', httpStatus: r.status };
  }
  return { ok: true, messageId: b.id, status: 'sent' };
}

export async function getEmailStatus(cfg: ProviderConfig, messageId: string): Promise<StatusSuccess | ProviderFailure> {
  const r = await call(cfg, `/emails/${encodeURIComponent(messageId)}`, { method: 'GET' });
  if ('ok' in r) return r;
  if (r.status !== 200) return parseProviderError(r.status, r.body);
  const b = (r.body ?? {}) as Record<string, unknown>;
  if (typeof b.last_event !== 'string') return { ok: false, retryable: true, code: 'BAD_RESPONSE', message: 'No status in response', httpStatus: 200 };
  return { ok: true, status: mapProviderStatus(b.last_event) };
}
