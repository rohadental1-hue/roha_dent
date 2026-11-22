# rohadent.com — Roha Speciality Dental Center

Public website, online booking, admin dashboard, and email notifications for Roha Speciality Dental Center (Addis Ababa and Gonder).

| Layer    | Tech |
|----------|------|
| Frontend | React + Vite + TypeScript, Tailwind, React Router, TanStack Query, React Hook Form + Zod, hosted on Cloudflare Pages |
| Backend  | Supabase (hosted): Postgres + RLS, Auth, Realtime, Edge Functions (Deno), pg_cron + pg_net |
| Email    | [Resend](https://resend.com/docs/api-reference) API, called only from Edge Functions |

> Status: **Phases 1–4 (schema and RLS, public site, booking flow, notifications) done** and deployed to the hosted Supabase project. **Phase 5 (staff dashboard at `/admin`) is built**. See [Dashboard](#dashboard-phase-5). Phase 6 (hardening and launch) is still to come.

**No Docker needed.** Everything below works with Node 20+ only. The Supabase CLI runs through `npx supabase@latest` and talks to the hosted project.

## Day-to-day

```bash
npm install
npm run dev        # http://localhost:5173, uses the Supabase project in apps/web/.env.local
npm test           # database tests (PGlite) + unit tests
npm run build      # type-check, client + SSR build, prerender to apps/web/dist/client
```

### Working offline or experimenting safely

```bash
npm run dev:api    # in-memory Postgres (PGlite) with all migrations and seed + the real Edge Functions under Deno
```

To use it, point `apps/web/.env.local` at it, then restart `npm run dev`:
```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=dev-anon-key
VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA
```
The dev API has no Auth, so it can't run the `/admin` dashboard. To work on the dashboard, point `npm run dev` at the hosted project.

The dev API resets on every start and uses Cloudflare's always-pass Turnstile test keys, so it needs an internet connection.

Email runs in **dry-run** mode in the dev API. The worker runs after every booking or manage call, and every 30 s it also handles retries. Nothing is sent. To see the rendered subjects, bodies and statuses, open http://127.0.0.1:54321/dev/emails. To send real emails from your machine, run `EMAIL_DRY_RUN=false RESEND_API_KEY=… EMAIL_FROM='Roha Dental <noreply@rohadent.com>' npm run dev:api`.

## Tests

| Command | What it covers |
|---|---|
| `npm run db:verify` | All migrations and the seed in PGlite, then `supabase/tests/database/*.test.sql`: RLS, booking, double-booking, slots, workflow triggers, rate limiting |
| `npm run test:functions` | Deno: Resend adapter (request shape, idempotency key, error codes, retryable vs. final, status mapping) and the HTML email layout, with a mocked `fetch` |
| `npm run test -w @roha/web` | Vitest: phone normalization, clinic timezone, slot grouping, email template rendering and HTML escaping |
| `npm test` | All of the above |

The `.test.sql` files are standard pgTAP. PGlite runs them through a small pgTAP shim (`scripts/pglite/`).

## Repo layout

```
apps/web/                React app: public site, booking
  src/admin/             /admin dashboard (lazy chunk, supabase-js + RLS; public pages never load it)
supabase/
  config.toml
  migrations/            Schema, RLS, RPCs, triggers, default config
  seed.sql               Locations, services, placeholder dentists, working hours
  tests/database/        pgTAP tests
  functions/
    _shared/             phone.ts, time.ts, schemas.ts, email.ts are pure TS, also imported by the web app as @shared/*;
                         http.ts, db.ts, turnstile.ts are Deno-only
      providers/         resend.ts: the only file that knows the email provider's API
    _tests/              Deno tests for the provider adapter
    create-booking/      POST: Zod, phone check, rate limits, Turnstile, then book_appointment()
    manage-booking/      POST {action: get|cancel|reschedule, token}
    send-email/          internal worker (x-worker-secret): sends queued email_log rows, retries, polls delivery
    admin-users/         owner-only: create staff accounts, change role/clinic, deactivate, reset password
scripts/
  dev-api.mjs            Local backend without Docker (PGlite + PostgREST stand-in + real functions)
  verify-db.mjs          Migrations + seed + tests in PGlite
docs/                    Launch checklist (phase 6)
```

## Data model

```
locations ─┬─< working_hours >── dentists ──< dentist_services >── services
           ├─< time_off (dentist_id null = whole clinic closed)
           ├─< appointments >── patients (1 per phone)
           │        ├── appointment_secrets (manage-link token, service_role only)
           │        └─< email_log
           └─< profiles (staff → location, owner → all)
settings (1 row) · email_templates (key × locale) · rate_limits · audit_log
```

Key rules:
- **No double-booking.** `appointments_no_overlap` is a btree_gist exclusion constraint on `(dentist_id, during)` that covers `pending` and `confirmed` appointments. It holds across both locations and for every write path, including direct SQL.
- **Slots** come from working hours (per dentist and location, on a 15-minute grid), minus time off, minus active appointments, and must start at least 2 hours from now and at most 60 days ahead. The slot length is the service duration. All of these values live in `settings`.
- **Online bookings** go through `book_appointment()`, which only `service_role` can execute (it is called from the `create-booking` Edge Function after Turnstile and rate-limit checks). With `dentist_id = null` ("any available"), the RPC picks the least-booked free dentist.
- **Manage links.** Each appointment gets a 256-bit random token, stored in `appointment_secrets`. Only Edge Functions can read it (they need it to put the link in emails). Staff and anon have no access.
- **Phones** are stored in E.164 format: `+2519XXXXXXXX` (Ethio Telecom) or `+2517XXXXXXXX` (Safaricom). The phone number identifies the patient; messages go by email.
- **Time** is stored as `timestamptz` (UTC). Clinic-local logic uses `Africa/Addis_Ababa` (`public.clinic_tz()`).

### Access (RLS)

| | anon | staff | owner |
|---|---|---|---|
| locations, services, dentists, working hours | read active | read all | read and write |
| slots (`get_available_slots`, `get_available_dates`, `get_booking_catalog`) | ✓ | ✓ | ✓ |
| appointments, patients, email_log | — | own location | all |
| time_off, working_hours (write) | — | own location | all |
| settings, email_templates | — | read | read and write |
| profiles | — | self | all |
| audit_log | — | — | read |
| appointment_secrets, rate_limits | — | — | — (service_role only) |

Staff can update only workflow columns on `appointments` (status, time, dentist, service, notes).

## Supabase project setup (hosted, no Docker)

Do the first two steps in a normal terminal, because login opens a browser:

```bash
npx supabase@latest login
npx supabase@latest link --project-ref <project-ref>
```

Then:

```bash
npx supabase@latest db push --remote --include-seed    # migrations + seed (seed: first time only)
cp supabase/.env.example supabase/functions/.env       # fill in; never commit
npx supabase@latest secrets set --env-file supabase/functions/.env
npx supabase@latest functions deploy create-booking manage-booking send-email admin-users --no-verify-jwt
```

In the dashboard:
- Enable the `pg_cron` and `pg_net` extensions.
- Turn off email sign-ups.

Set `apps/web/.env.local` to the project URL and the **publishable** (anon) key. Never use the service_role key in the web app.

### Email setup (Resend)

Patients get emails through [Resend](https://resend.com/docs/api-reference). This replaced SMS Ethiopia in migration `0019`; old text messages stay in the log, marked "old SMS".

How it works: a change to an appointment fires a deferred trigger at commit. The trigger renders the template's subject and body and adds a row to `email_log` with status `queued`. pg_net then calls the `send-email` Edge Function right away, which wraps the text in the Roha HTML layout and sends it through Resend. The `email_log` id is the Idempotency-Key, so a retry never sends twice. pg_cron runs the worker tick every minute, which handles retries, stuck rows and delivery polling (`GET /emails/{id}`, for 24 hours). What gets emailed:

- **Confirmed**: when staff confirm, or when a booking is created as confirmed.
- **Cancelled**: by staff or by the patient's link.
- **New time**: when a confirmed booking moves.

Patients get nothing while a booking is pending, and there is no clinic alert any more. The address used is the one given with the booking (`appointments.email`), falling back to `patients.email`. A booking without an address, such as a walk-in, still gets a `skipped` row, so staff can see that they need to call.

1. **Resend.**
   - Add and verify the sending domain (`rohadent.com`) under Resend → Domains, using the DNS records it shows.
   - Create an API key with "Sending access".
2. **Push and deploy:**
   ```bash
   npx supabase@latest db push --remote
   npx supabase@latest functions deploy create-booking manage-booking send-email --no-verify-jwt
   npx supabase@latest functions delete send-sms sms-delivery-webhook   # the old SMS functions
   ```
3. **Secrets.**
   - In `supabase/functions/.env`, set `EMAIL_WORKER_SECRET` to a random string (for example from `openssl rand -hex 32`).
   - Set `EMAIL_FROM` (e.g. `Roha Dental <noreply@rohadent.com>`) and `RESEND_API_KEY`, and keep `EMAIL_DRY_RUN=true` for now.
   - Run `npx supabase@latest secrets set --env-file supabase/functions/.env`.
4. **Vault.** pg_net uses these to call the worker. `project_url` already exists from the SMS setup. In the SQL editor, run:
   ```sql
   select vault.create_secret('<same value as EMAIL_WORKER_SECRET>', 'email_worker_secret');
   ```
5. **Cron.** Migration `0019` swaps the `sms-worker` job for `email-worker` when pg_cron is enabled. Check with `select jobname from cron.job;`.
6. **Dry-run check.** Make a test booking and confirm it in the dashboard. Within a few seconds `email_log` should show a row with status `dry_run`. Check the `send-email` function logs.
7. **Go live.** Change `EMAIL_DRY_RUN` to `false` and run `secrets set` again. Book with your own address, confirm the booking, and check that the row moves `sent` → `delivered`.

Failures: `email_log.error_code` is one of the following.

| Code | Meaning | Retried? |
|---|---|---|
| `VALIDATION` | Bad address | No (status `rejected`) |
| `AUTH` | Wrong key or unverified domain | No |
| `CONFIG` | Secrets missing | No |
| `RATE_LIMITED` / `SERVER` / `NETWORK` | Temporary problem | Once, after 60 s |

Bounces and spam complaints show up as red labels in the dashboard. Templates are in `email_templates` (subject + plain-text body) and use the placeholders listed in `_shared/email.ts`.

### Dashboard (phase 5)

`/admin` is the staff dashboard. Users sign in with an email and password through Supabase Auth, and RLS controls what each one sees.

| Page | Staff (own clinic) | Owner |
|---|---|---|
| Appointments: day view, a "needs confirmation" queue, live updates, a toast for each new online booking | ✓ | ✓ (all clinics, or filtered to one) |
| Appointment panel: confirm, complete, no-show, cancel, reschedule (shows free times, or type any time), internal notes, patient email (add or change), email history and resend | ✓ | ✓ |
| New appointment (phone call or walk-in, looks up returning patients by phone) | ✓ | ✓ |
| Patients: search, visit history, notes | ✓ | ✓ |
| Email log: filters, last 24 h stats, resend | ✓ | ✓ |
| Schedule: weekly working hours, closures and time off (lists bookings that fall inside them) | ✓ | ✓ |
| Settings and email templates (subject + text, with a live preview) | read only | ✓ |
| Clinic setup (clinics, services, dentists and the services each one offers), Staff, Activity log | — | ✓ |

Every change a patient should hear about (confirm, cancel, reschedule) sends its email automatically through the database triggers (migration 0019).

**Staff accounts.** On the Staff page, the owner creates an account and gets a **temporary password** to hand over in person. The staff member has to choose their own password at first sign-in. No email is sent, because Supabase's built-in mailer only delivers to project team members. "Reset password" issues a new temporary password, and "Deactivate" blocks sign-in immediately.

Deploy the account function once:
```bash
npx supabase@latest functions deploy admin-users --no-verify-jwt
```

The public marketing pages (`src/content/*`) are still static. The dashboard's Clinic setup page edits the records that booking and emails use, such as dentist names and durations.

### Website on Cloudflare (Workers static assets)

The site is static: prerendered public pages, plus one SPA shell (`app.html`, served at `/app`) for `/admin`, `/booking/*` and `/b/*`. Cloudflare serves it as a Worker with static assets only, configured in `wrangler.jsonc` at the repo root. `apps/web/public/_redirects` and `_headers` (CSP, noindex for app routes, caching) are applied automatically.

**Connected to GitHub (Workers Builds).** Every push to `main` deploys. The project settings:
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Build variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (the publishable key), `VITE_SITE_URL`, `VITE_TURNSTILE_SITE_KEY`

Manual deploy from this machine: run `npx wrangler login` once, then `npm run deploy:web`.

The site's address (`*.workers.dev`, later `rohadent.com`) must also be listed in three places:
1. `ALLOWED_ORIGINS` and `PUBLIC_SITE_URL` in `supabase/functions/.env`, then run `secrets set`
2. the Turnstile widget's hostnames
3. **Settings → Website address** in the dashboard, which is used for email links

### First owner account

Go to **Authentication → Users → Add user**, then run this in the SQL editor:

```sql
insert into public.profiles (id, full_name, role)
select id, 'Clinic Owner', 'owner' from auth.users where email = 'owner@example.com';
```

Then sign in at `/admin` and create staff accounts from the **Staff** page.

### Schema changes

1. Add a new file in `supabase/migrations/`.
2. Run `npm run db:verify`.
3. Run `npx supabase@latest db push --remote`.

Never edit a migration that has already been pushed.

## Environment variables

- `supabase/.env.example`: Edge Function secrets (Resend, Turnstile, site URL, allowed origins)
- `apps/web/.env.example`: public Vite variables (Supabase URL, publishable key, Turnstile site key)
