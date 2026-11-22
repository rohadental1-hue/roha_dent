// Row shapes used by the dashboard (hand-written subset of the schema in supabase/migrations).

export type Role = 'owner' | 'staff';
export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
export type AppointmentSource = 'online' | 'phone' | 'walk_in' | 'admin';
export type EmailType =
  | 'booking_received' | 'booking_confirmed' | 'booking_cancelled' | 'booking_rescheduled'
  | 'reminder_24h' | 'reminder_2h' | 'clinic_new_booking';
export type EmailStatus =
  | 'queued' | 'sending' | 'dry_run' | 'accepted' | 'sent' | 'delivered'
  | 'undelivered' | 'failed' | 'rejected' | 'expired' | 'skipped' | 'bounced' | 'complained';

export type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  role: Role;
  location_id: string | null;
  is_active: boolean;
};

export type Location = {
  id: string; slug: string; name: string; city: string; phone: string; address: string | null;
  opening_hours_note: string | null; is_active: boolean; sort_order: number;
};
export type Service = {
  id: string; slug: string; name: string; summary: string | null; duration_minutes: number;
  price_from_etb: number | null; is_bookable: boolean; is_active: boolean; sort_order: number;
};
export type Dentist = {
  id: string; slug: string; full_name: string; title: string | null; accepts_online_booking: boolean;
  is_active: boolean; sort_order: number;
};
export type DentistService = { dentist_id: string; service_id: string };
export type WorkingHours = {
  id: string; dentist_id: string; location_id: string; weekday: number; start_time: string; end_time: string;
};
export type TimeOff = {
  id: string; dentist_id: string | null; location_id: string | null; starts_at: string; ends_at: string;
  reason: string | null; created_at: string;
};

export type PatientLite = { id: string; full_name: string; phone: string };
export type Patient = PatientLite & { email: string | null; notes: string | null; created_at: string };

export type Appointment = {
  id: string;
  location_id: string;
  dentist_id: string;
  service_id: string;
  patient_id: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  source: AppointmentSource;
  patient_notes: string | null;
  internal_notes: string | null;
  reschedule_count: number;
  cancel_reason: string | null;
  cancelled_by: 'patient' | 'staff' | 'system' | null;
  created_at: string;
  /** E-mail given with this booking (falls back to the patient's saved one). */
  email: string | null;
  patient: PatientLite & { email: string | null };
};

export type EmailRow = {
  id: string;
  appointment_id: string | null;
  location_id: string | null;
  type: EmailType;
  /** Old rows sent as SMS (provider 'smsethiopia') hold a phone number here. */
  to_email: string;
  subject: string | null;
  body: string;
  provider: string;
  status: EmailStatus;
  error_code: string | null;
  error: string | null;
  attempts: number;
  resend_of: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  created_at: string;
};

export type Settings = {
  auto_confirm: boolean;
  slot_interval_minutes: number;
  min_lead_minutes: number;
  max_advance_days: number;
  cancel_cutoff_minutes: number;
  max_reschedules: number;
  max_active_bookings_per_patient: number;
  email_enabled: boolean;
  public_site_url: string;
  updated_at: string;
};

export type EmailTemplate = { key: EmailType; locale: 'en' | 'am'; subject: string; body: string; is_active: boolean; updated_at: string };

export type AuditRow = {
  id: number; actor_id: string | null; actor_type: 'staff' | 'patient' | 'system'; action: string; entity: string;
  entity_id: string | null; location_id: string | null; changes: Record<string, unknown> | null; created_at: string;
};

export const APPOINTMENT_SELECT =
  'id, location_id, dentist_id, service_id, patient_id, starts_at, ends_at, status, source, patient_notes, internal_notes, reschedule_count, cancel_reason, cancelled_by, created_at, email, patient:patients(id, full_name, phone, email)';

// Plain words for front-desk staff.
export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  pending: 'To confirm', confirmed: 'Confirmed', cancelled: 'Cancelled', completed: 'Visited', no_show: 'Didn’t come',
};
export const SOURCE_LABEL: Record<AppointmentSource, string> = {
  online: 'Website', phone: 'Phone call', walk_in: 'Walk-in', admin: 'Staff',
};
export const EMAIL_TYPE_LABEL: Record<EmailType, string> = {
  booking_received: 'Request received (no longer sent)',
  booking_confirmed: 'Booking confirmed',
  booking_cancelled: 'Booking cancelled',
  booking_rescheduled: 'New time',
  reminder_24h: 'Reminder (day before)',
  reminder_2h: 'Reminder (2 hours before)',
  clinic_new_booking: 'Alert to clinic (no longer sent)',
};
/** Kinds that are still sent (filter options). Older kinds only appear on old log rows. */
const RETIRED: EmailType[] = ['booking_received', 'reminder_24h', 'reminder_2h', 'clinic_new_booking'];
export const EMAIL_TYPES = (Object.keys(EMAIL_TYPE_LABEL) as EmailType[]).filter((t) => !RETIRED.includes(t));
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** E-mail delivery state in plain words, with what staff should do about it. */
export function emailState(status: EmailStatus): { label: string; tone: 'ok' | 'wait' | 'bad' | 'off'; help: string } {
  switch (status) {
    case 'delivered': return { label: 'Delivered', tone: 'ok', help: 'The e-mail reached the patient’s mailbox.' };
    case 'queued': case 'sending': return { label: 'Waiting to send', tone: 'wait', help: 'It will be sent within a minute.' };
    case 'accepted': case 'sent': return { label: 'Sending…', tone: 'wait', help: 'Sent; waiting for the patient’s mail server to accept it.' };
    case 'bounced': return { label: 'Bounced', tone: 'bad', help: 'The address does not work. Call the patient and check their e-mail address.' };
    case 'complained': return { label: 'Marked as spam', tone: 'bad', help: 'The patient marked this e-mail as spam. Call them instead.' };
    case 'undelivered': case 'expired': return { label: 'Not delivered', tone: 'bad', help: 'Call the patient, or press “Send again” later.' };
    case 'failed': case 'rejected': return { label: 'Not sent', tone: 'bad', help: 'See the reason below. Call the patient so they are informed.' };
    case 'skipped': return { label: 'Not sent', tone: 'off', help: 'E-mail or this message type is switched off in Settings, or the patient has no e-mail address.' };
    case 'dry_run': return { label: 'Test mode', tone: 'off', help: 'E-mail was in test mode — nothing was sent.' };
  }
}

/** Provider error codes → what to do. */
export const EMAIL_ERROR_HELP: Record<string, string> = {
  VALIDATION: 'The e-mail address looks wrong. Check it with the patient.',
  AUTH: 'The e-mail account key or sending domain is wrong. Tell the clinic owner.',
  CONFIG: 'E-mail is not set up yet. Tell the clinic owner.',
};

/** Who a log row went to: an e-mail address, or a phone number on old SMS rows. */
export function recipientLabel(m: Pick<EmailRow, 'to_email' | 'provider'>, formatPhone: (e164: string) => string): string {
  return m.provider === 'smsethiopia' ? `${formatPhone(m.to_email)} (old SMS)` : m.to_email;
}
