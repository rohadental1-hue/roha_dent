import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight } from 'lucide-react';
import type { BeforeAfterCase } from '../content/beforeAfter';
import { getService } from '../content/services';
import { srcSet } from '../lib/img';
import { stagger } from '../lib/useReveal';

/**
 * Real patient results: each case is a card with the "before" and "after" photos side by side.
 * Several cases form a row that swipes on phones; a single case (treatment pages) fills the width.
 */
export function ResultsGallery({ items, showLinks = true, stacked = false }: { items: BeforeAfterCase[]; showLinks?: boolean; stacked?: boolean }) {
  const { t } = useTranslation();
  // treatment pages stack their cases in the text column; the home page shows a row
  const single = stacked || items.length === 1;
  return (
    <ul className={single ? 'grid max-w-xl gap-4' : '-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-2 md:gap-5 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-3'}>
      {items.map((c, i) => {
        const service = getService(c.treatment);
        return (
          <li key={c.id} data-reveal style={stagger(i % 3)} className={single ? '' : 'w-[85%] shrink-0 snap-start md:w-auto'}>
            <figure className="flex h-full flex-col overflow-hidden rounded-card bg-white ring-1 ring-line">
              <div className="grid grid-cols-2 gap-0.5 bg-line">
                {(['before', 'after'] as const).map((k) => (
                  <div key={k} className="relative">
                    <img src={k === 'before' ? c.beforeImage : c.afterImage} srcSet={srcSet(k === 'before' ? c.beforeImage : c.afterImage, 900)} sizes="(min-width: 640px) 18rem, 50vw"
                      alt={t(k === 'before' ? 'beforeAfter.beforeAlt' : 'beforeAfter.afterAlt', { title: c.title })}
                      width={900} height={600} loading="lazy" decoding="async" className="aspect-[3/2] w-full object-cover" />
                    <span className="absolute top-2 left-2 rounded-md bg-ink/55 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                      {t(k === 'before' ? 'beforeAfter.before' : 'beforeAfter.after')}
                    </span>
                  </div>
                ))}
              </div>
              <figcaption className="flex flex-1 items-start justify-between gap-3 p-4">
                <span className="text-[0.9375rem] leading-snug text-ink">{c.description}</span>
                {showLinks && service && (
                  <Link to={`/services/${service.slug}`} aria-label={`${t('beforeAfter.seeTreatment')}: ${service.shortName}`}
                    className="grid size-8 shrink-0 place-items-center rounded-full border border-line text-roha-700 transition-colors hover:border-roha-700 hover:bg-roha-700 hover:text-white">
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                  </Link>
                )}
              </figcaption>
            </figure>
          </li>
        );
      })}
    </ul>
  );
}
