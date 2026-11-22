import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { DEFAULT_TEMPLATES, escapeHtml, renderTemplate, SAMPLE_VARS, textToHtml, toEmailHtml } from '@shared/email.ts';

describe('renderTemplate', () => {
  it('replaces known placeholders, keeps unknown ones', () => {
    expect(renderTemplate('Hi {patient_name}, {time} {unknown}', { patient_name: 'Abebe', time: '09:30' })).toBe('Hi Abebe, 09:30 {unknown}');
  });
  it('null/undefined render as empty', () => {
    expect(renderTemplate('[{a}]', { a: null })).toBe('[]');
  });
});

describe('email HTML', () => {
  it('escapes everything the patient or staff typed', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  });
  it('makes links clickable, keeps the full stop after a link outside it, keeps line breaks', () => {
    const html = textToHtml('Change:\nhttps://rohadent.com/b/AbC_d-1.');
    expect(html).toContain('Change:<br><a href="https://rohadent.com/b/AbC_d-1" ');
    expect(html.endsWith('</a>.')).toBe(true);
  });
  it('does not turn a javascript: text into a link', () => {
    expect(textToHtml('javascript:alert(1)')).not.toContain('<a ');
  });
  it('wraps the text in the Roha layout', () => {
    const html = toEmailHtml('Subject <x>', 'Hi Abebe');
    expect(html).toContain('<title>Subject &lt;x&gt;</title>');
    expect(html).toContain('Roha Speciality Dental Center');
    expect(html).toContain('Hi Abebe');
  });
});

describe('default email texts', () => {
  it.each(Object.entries(DEFAULT_TEMPLATES))('%s renders without leftover placeholders', (_k, t) => {
    expect(renderTemplate(t.subject, SAMPLE_VARS)).not.toMatch(/\{[a-z_]+\}/);
    expect(renderTemplate(t.body, SAMPLE_VARS)).not.toMatch(/\{[a-z_]+\}/);
  });
  it('the migration installs exactly these texts', () => {
    const dir = new URL('../../../../supabase/migrations/', import.meta.url);
    const file = readdirSync(dir).find((f) => f.includes('email_via_resend'))!;
    const sql = readFileSync(new URL(file, dir), 'utf8');
    for (const t of Object.values(DEFAULT_TEMPLATES)) {
      expect(sql).toContain(t.subject.replace(/'/g, "''"));
      expect(sql).toContain(t.body.replace(/'/g, "''").replace(/\n/g, '\\n'));
    }
  });
});
