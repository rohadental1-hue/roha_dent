// E-mail text helpers. Pure TS — shared by Edge Functions and the web app (template editor preview).
//
// Templates are plain text with {placeholders} (rendered by SQL public.render_template when the
// message is queued). The send-email worker turns the text into a simple HTML e-mail with toEmailHtml().

/** Same rules as SQL public.render_template: {key} → value; unknown placeholders are left as-is. */
export function renderTemplate(body: string, vars: Record<string, string | number | null | undefined>): string {
  return body.replace(/\{([a-z_]+)\}/g, (m, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key] ?? '') : m,
  );
}

export const TEMPLATE_PLACEHOLDERS = [
  'patient_name', 'patient_full_name', 'date', 'time', 'service', 'location', 'dentist', 'location_phone', 'manage_link',
  'patient_phone', 'status', 'local_time', 'local_date',
] as const;
export type TemplateVar = (typeof TEMPLATE_PLACEHOLDERS)[number];

/** Sample values for previews (typical lengths). */
export const SAMPLE_VARS: Record<TemplateVar, string> = {
  patient_name: 'Abebe',
  patient_full_name: 'Abebe Kebede',
  date: 'Tue 10 Nov',
  time: '09:30',
  service: 'Scaling (Teeth Cleaning)',
  location: 'Addis Ababa',
  dentist: 'Dr. Selam Bekele',
  location_phone: '+251 94 604 0506',
  manage_link: 'https://rohadent.com/b/3k9QzR7xWm2pL5vN8bY4tH',
  patient_phone: '+251911234567',
  status: 'pending',
  local_time: '3:30 ጠዋት',
  local_date: 'ኅዳር 1',
};

export type EmailTemplateText = { subject: string; body: string };

/** Default English texts (also installed by migration 0019). */
export const DEFAULT_TEMPLATES: Record<string, EmailTemplateText> = {
  booking_confirmed: {
    subject: 'Your appointment is confirmed: {date} at {time}',
    body: 'Hi {patient_name},\n\nYour appointment at Roha Speciality Dental Center is confirmed.\n\nTreatment: {service}\nDate: {date} ({local_date})\nTime: {time} ({local_time})\nClinic: {location}\nDentist: {dentist}\n\nNeed to change or cancel? Use your personal link:\n{manage_link}\n\nQuestions? Call us on {location_phone}.\n\nSee you soon,\nRoha Speciality Dental Center',
  },
  booking_cancelled: {
    subject: 'Your appointment on {date} has been cancelled',
    body: 'Hi {patient_name},\n\nYour appointment on {date} at {time} at our {location} clinic has been cancelled.\n\nTo book a new time, visit rohadent.com/book or call us on {location_phone}.\n\nRoha Speciality Dental Center',
  },
  booking_rescheduled: {
    subject: 'Your appointment has moved to {date} at {time}',
    body: 'Hi {patient_name},\n\nYour appointment has been moved.\n\nNew date: {date} ({local_date})\nNew time: {time} ({local_time})\nTreatment: {service}\nClinic: {location}\nDentist: {dentist}\n\nDetails, changes or cancelling:\n{manage_link}\n\nQuestions? Call us on {location_phone}.\n\nRoha Speciality Dental Center',
  },
};

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const URL_RE = /\b(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g;

/** Escaped text with links made clickable and line breaks kept. */
export function textToHtml(text: string): string {
  return escapeHtml(text)
    .replace(URL_RE, (url) => `<a href="${url}" style="color:#0f5e5a;font-weight:600;word-break:break-all">${url}</a>`)
    .replace(/\r?\n/g, '<br>');
}

/** The full HTML e-mail: Roha header, the text, a small footer. Inline styles only (e-mail clients). */
export function toEmailHtml(subject: string, bodyText: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f1ea">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden">
<tr><td style="background:#0f5e5a;padding:18px 24px;color:#ffffff;font:700 18px/1.3 Georgia,'Times New Roman',serif">Roha Speciality Dental Center</td></tr>
<tr><td style="padding:24px;color:#1d2a29;font:15px/1.6 -apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">${textToHtml(bodyText)}</td></tr>
<tr><td style="padding:14px 24px;border-top:1px solid #ece7dc;color:#6b7775;font:12px/1.5 -apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
You get this e-mail because you booked an appointment at rohadent.com. Addis Ababa &middot; Gonder</td></tr>
</table></td></tr></table>
</body></html>`;
}
