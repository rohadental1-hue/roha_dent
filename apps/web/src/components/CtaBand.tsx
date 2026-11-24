import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { CalendarDays, Phone } from 'lucide-react';
import { locations } from '../content/locations';
import { stagger } from '../lib/useReveal';

/** Closing band: a white, centred "book or call" section. */
export function CtaBand({ title = 'Book your first step', body, bookTo = '/book' }: { title?: string; body?: string; bookTo?: string }) {
  const { t } = useTranslation();
  return (
    <section id="book" aria-labelledby="book-h"
      className="py-[clamp(5rem,10vw,8.75rem)]">
      <div className="wrap flex flex-col items-center text-center">
        <h2 id="book-h" data-reveal className="text-h2 max-w-[18ch]">{title}</h2>
        <p data-reveal style={stagger(2)} className="mt-3.5 max-w-[46ch]">
          {body ?? 'Pick a clinic, a treatment and a time online in about a minute. The clinic confirms your visit by email.'}
        </p>
        <div data-reveal style={stagger(3)} className="mt-[clamp(1.75rem,4vw,2.75rem)] flex flex-wrap items-center justify-center gap-3">
          <Link to={bookTo} className="btn-primary min-h-11 pl-2 text-[0.9375rem]">
            <span className="btn-ic"><CalendarDays className="size-4" aria-hidden="true" /></span>
            {t('cta.book')}
          </Link>
          {locations.map((l) => (
            <a key={l.slug} href={`tel:${l.phoneE164}`} className="btn-ghost min-h-11 text-[0.9375rem]">
              <Phone className="size-4" aria-hidden="true" />{t('cta.callCity', { city: l.city })}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
