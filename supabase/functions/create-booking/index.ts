// POST /functions/v1/create-booking
// Public endpoint (verify_jwt = false). Gates: Zod → phone → rate limits (IP, phone, e-mail) → Turnstile → book_appointment RPC.
import { bookingRequestSchema } from '../_shared/schemas.ts';
import { normalizeEthiopianPhone } from '../_shared/phone.ts';
import { clientIp, dbError, fail, json, preflight, readJson } from '../_shared/http.ts';
import { admin, allow, manageUrl } from '../_shared/db.ts';
import { verifyTurnstile } from '../_shared/turnstile.ts';

type BookedRow = {
  appointment_id: string;
  manage_token: string;
  status: string;
  dentist_id: string;
  starts_at: string;
  ends_at: string;
};

Deno.serve(async (req) => {
  const early = preflight(req);
  if (early) return early;

  const body = await readJson(req);
  if (body === undefined) return fail(req, 400, 'INVALID_JSON');

  const parsed = bookingRequestSchema.safeParse(body);
  if (!parsed.success) {
    return fail(req, 400, 'VALIDATION', parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })));
  }
  const input = parsed.data;
  if (input.website) return fail(req, 400, 'VALIDATION'); // honeypot

  const phone = normalizeEthiopianPhone(input.phone);
  if (!phone.ok) return fail(req, 400, 'INVALID_PHONE');

  const ip = clientIp(req);
  const [ipOk, phoneOk, emailOk] = await Promise.all([
    allow(`book:ip:${ip}`, 5, 3600), // 5 bookings / hour / IP
    allow(`book:phone:${phone.e164}`, 3, 86400), // 3 bookings / day / phone
    allow(`book:email:${input.email}`, 3, 86400), // 3 bookings / day / e-mail address
  ]);
  if (!ipOk || !phoneOk || !emailOk) return fail(req, 429, 'RATE_LIMITED');

  if (!(await verifyTurnstile(input.turnstileToken, ip))) return fail(req, 403, 'TURNSTILE_FAILED');

  const { data, error } = await admin()
    .rpc('book_appointment', {
      p_location_id: input.locationId,
      p_service_id: input.serviceId,
      p_dentist_id: input.dentistId,
      p_starts_at: input.startsAt,
      p_full_name: input.fullName,
      p_phone: phone.e164,
      p_patient_notes: input.notes ?? null,
      p_email: input.email,
    })
    .single<BookedRow>();
  if (error) return dbError(req, error);

  // Nothing is e-mailed yet: the patient gets "confirmed" once staff confirm (trigger from migration 0019),
  // or right away when the clinic auto-confirms.

  return json(req, 201, {
    appointment: {
      id: data.appointment_id,
      status: data.status,
      dentistId: data.dentist_id,
      startsAt: data.starts_at,
      endsAt: data.ends_at,
    },
    manageToken: data.manage_token,
    manageUrl: manageUrl(data.manage_token),
  });
});
