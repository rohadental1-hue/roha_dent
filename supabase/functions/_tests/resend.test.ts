// deno test (from supabase/functions/_tests):  npx deno test --allow-env
import { assert, assertEquals, assertObjectMatch, assertStringIncludes } from '@std/assert';
import {
  getEmailStatus, mapProviderStatus, parseProviderError, sendEmail, type ProviderConfig,
} from '../_shared/providers/resend.ts';
import { renderTemplate, textToHtml, toEmailHtml } from '../_shared/email.ts';

type Call = { url: string; method: string; headers: Record<string, string>; body: unknown };

function fakeFetch(status: number, body: unknown, calls: Call[] = []): typeof fetch {
  return ((url: string, init: RequestInit) => {
    calls.push({
      url,
      method: init.method ?? 'GET',
      headers: init.headers as Record<string, string>,
      body: init.body ? JSON.parse(init.body as string) : undefined,
    });
    return Promise.resolve(new Response(typeof body === 'string' ? body : JSON.stringify(body), { status }));
  }) as unknown as typeof fetch;
}

const cfg = (f: typeof fetch): ProviderConfig => ({ apiKey: 're_test', from: 'Roha Dental <noreply@rohadent.com>', fetch: f });
const msg = { to: 'abebe@example.com', subject: 'Hi', html: '<p>Hi</p>', text: 'Hi', idempotencyKey: 'row-1' };

Deno.test('send: posts to /emails with bearer key, idempotency key and from/to/subject/html/text', async () => {
  const calls: Call[] = [];
  const r = await sendEmail(cfg(fakeFetch(200, { id: '49a3999c-0ce1-4ea6-ab68-afcd6dc2e794' }, calls)), msg);
  assertEquals(r, { ok: true, messageId: '49a3999c-0ce1-4ea6-ab68-afcd6dc2e794', status: 'sent' });
  assertEquals(calls[0].url, 'https://api.resend.com/emails');
  assertEquals(calls[0].method, 'POST');
  assertEquals(calls[0].headers.Authorization, 'Bearer re_test');
  assertEquals(calls[0].headers['Idempotency-Key'], 'row-1');
  assertEquals(calls[0].body, {
    from: 'Roha Dental <noreply@rohadent.com>', to: ['abebe@example.com'], subject: 'Hi', html: '<p>Hi</p>', text: 'Hi',
  });
});

Deno.test('send: validation error is not retryable and keeps the provider message', async () => {
  const r = await sendEmail(cfg(fakeFetch(422, { statusCode: 422, name: 'validation_error', message: 'Invalid `to` field.' })), msg);
  assertObjectMatch(r, { ok: false, retryable: false, code: 'VALIDATION', message: 'Invalid `to` field.', httpStatus: 422 });
});

Deno.test('send: 401/403 are config errors, 429 and 5xx are retryable', async () => {
  assertObjectMatch(await sendEmail(cfg(fakeFetch(401, {})), msg), { ok: false, code: 'AUTH', retryable: false });
  assertObjectMatch(await sendEmail(cfg(fakeFetch(403, { message: 'The rohadent.com domain is not verified.' })), msg),
    { ok: false, code: 'AUTH', retryable: false, message: 'The rohadent.com domain is not verified.' });
  assertObjectMatch(await sendEmail(cfg(fakeFetch(429, {})), msg), { ok: false, code: 'RATE_LIMITED', retryable: true });
  assertObjectMatch(await sendEmail(cfg(fakeFetch(503, 'upstream down')), msg), { ok: false, code: 'SERVER', retryable: true });
});

Deno.test('send: network failure is retryable', async () => {
  const failing = (() => Promise.reject(new TypeError('connection reset'))) as unknown as typeof fetch;
  assertObjectMatch(await sendEmail(cfg(failing), msg), { ok: false, code: 'NETWORK', retryable: true });
});

Deno.test('send: 200 without id is treated as failure', async () => {
  assertObjectMatch(await sendEmail(cfg(fakeFetch(200, {})), msg), { ok: false, code: 'BAD_RESPONSE', retryable: false });
});

Deno.test('status: GET /emails/{id}', async () => {
  const calls: Call[] = [];
  const r = await getEmailStatus(cfg(fakeFetch(200, { id: 'ABC', last_event: 'delivered' }, calls)), 'ABC');
  assertEquals(r, { ok: true, status: 'delivered' });
  assertEquals(calls[0].url, 'https://api.resend.com/emails/ABC');
  assertEquals(calls[0].method, 'GET');
});

Deno.test('status mapping covers every documented event', () => {
  assertEquals(
    ['queued', 'scheduled', 'sent', 'delivery_delayed', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'failed', 'canceled', undefined]
      .map(mapProviderStatus),
    ['sent', 'sent', 'sent', 'sent', 'delivered', 'delivered', 'delivered', 'bounced', 'complained', 'failed', 'failed', 'sent'],
  );
});

Deno.test('parseProviderError: 404', () => {
  assertObjectMatch(parseProviderError(404, {}), { code: 'NOT_FOUND', retryable: false });
});

Deno.test('html: text is escaped, links clickable, line breaks kept', () => {
  const html = textToHtml('Hi <b>Abebe</b> & co\nLink: https://rohadent.com/b/abc_DEF-1.');
  assertStringIncludes(html, 'Hi &lt;b&gt;Abebe&lt;/b&gt; &amp; co<br>');
  assertStringIncludes(html, '<a href="https://rohadent.com/b/abc_DEF-1" ');
  assert(html.endsWith('</a>.'), 'trailing full stop stays outside the link');
});

Deno.test('html: full e-mail contains the escaped subject and body', () => {
  const html = toEmailHtml('Confirmed <today>', renderTemplate('Hi {patient_name}', { patient_name: 'Abebe' }));
  assertStringIncludes(html, '<title>Confirmed &lt;today&gt;</title>');
  assertStringIncludes(html, 'Hi Abebe');
});
