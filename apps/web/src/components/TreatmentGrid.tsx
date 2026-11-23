import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, Clock } from 'lucide-react';
import { services, isBookable, type Service } from '../content/services';
import { stagger } from '../lib/useReveal';
import { Badge } from '@/components/ui/badge';
import { srcSet } from '../lib/img';
import { preloadLarge, startFlight } from '../lib/photoFlight';

/**
 * Treatments as plain cards that open their page; the last card is the "not sure"
 * route into a check-up. /services shows every treatment, the home page only the main ones.
 */
export function TreatmentGrid({ headingLevel = 'h3', items = services, showAllLink = false }: { headingLevel?: 'h2' | 'h3'; items?: Service[]; showAllLink?: boolean }) {
  const { t } = useTranslation();
  const H = headingLevel;
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((s, i) => (
        <li key={s.slug} data-reveal style={stagger(i % 4)} className="grid">
          <Link
            to={`/services/${s.slug}`}
            // the photo lifts off and flies into the treatment page's header photo
            onClick={(e) => {
              if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
              startFlight(s.slug, e.currentTarget.querySelector('[data-flight-frame]'));
            }}
            onPointerEnter={(e) => preloadLarge(e.currentTarget.querySelector('img'))}
            className="group relative flex overflow-hidden rounded-card bg-white max-sm:flex-row sm:flex-col ring-1 ring-line transition-[box-shadow,transform] duration-300 ease-out-soft active:scale-[0.98] active:duration-100 hover:-translate-y-1 hover:shadow-[0_18px_40px_-24px_rgb(15_35_80/0.45)] hover:ring-roha-300 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="relative block max-sm:w-28 max-sm:shrink-0">
              <span data-flight-frame className="block overflow-hidden max-sm:h-full" aria-hidden="true">
                <img src={s.image} srcSet={srcSet(s.image, 1200)} sizes="(min-width: 1024px) 18rem, (min-width: 640px) 50vw, 100vw"
                  alt="" width={1200} height={800} loading="lazy" decoding="async"
                  className="aspect-[16/10] w-full object-cover max-sm:aspect-auto max-sm:h-full transition-transform duration-700 ease-out-soft group-hover:scale-[1.04]" />
              </span>
              {/* visit length as a frosted label on the photo; the newer treatments take several visits, so none */}
              {isBookable(s) && (
                <Badge variant="secondary" className="absolute top-3 left-3 bg-white/85 max-sm:hidden tabular-nums backdrop-blur-md">
                  <Clock data-icon="inline-start" />
                  {t('common.minutes', { count: s.durationMinutes })}
                </Badge>
              )}
            </span>
            <div className="flex flex-1 flex-col p-5 max-sm:p-4">
              <div className="flex items-start justify-between gap-3">
                <H className="font-display text-xl leading-tight text-ink max-sm:text-lg">{s.shortName}</H>
                <span className="grid size-8 shrink-0 place-items-center rounded-full border border-line text-roha-700 transition-colors duration-300 group-hover:border-roha-700 group-hover:bg-roha-700 group-hover:text-white" aria-hidden="true">
                  <ArrowUpRight className="size-4" />
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed">{s.summary}</p>
            </div>
          </Link>
        </li>
      ))}
      {showAllLink && (
        <li data-reveal style={stagger(2)} className="grid">
          <Link
            to="/services"
            className="group flex flex-col rounded-card bg-page p-5 ring-1 ring-line transition-[box-shadow,transform] duration-300 ease-out-soft hover:-translate-y-1 hover:shadow-[0_18px_40px_-24px_rgb(15_35_80/0.45)] hover:ring-roha-300"
          >
            <span className="grid size-8 place-items-center self-end rounded-full border border-line text-roha-700 transition-colors duration-300 group-hover:border-roha-700 group-hover:bg-roha-700 group-hover:text-white" aria-hidden="true">
              <ArrowUpRight className="size-4" />
            </span>
            <H className="mt-auto pt-6 font-display text-xl leading-tight text-ink">See all treatments</H>
            <p className="mt-2 text-sm leading-relaxed">
              Gum treatment, oral surgery, children's dentistry, crowns, dentures and more.
            </p>
          </Link>
        </li>
      )}
      <li data-reveal style={stagger(3)} className="grid">
        <Link
          to="/book?service=checkup"
          className="group on-blue flex flex-col rounded-card bg-roha-700 p-5 text-white transition-[box-shadow,transform] duration-300 ease-out-soft hover:-translate-y-1 hover:shadow-[0_18px_40px_-20px_rgb(15_35_80/0.7)]"
        >
          <span className="grid size-8 place-items-center self-end rounded-full bg-adey text-roha-900 transition-transform duration-300 group-hover:rotate-45" aria-hidden="true">
            <ArrowUpRight className="size-4" />
          </span>
          <H className="mt-auto pt-6 font-display text-xl leading-tight text-white">Not sure what you need?</H>
          <p className="mt-2 text-sm leading-relaxed text-white/85">
            Book a check-up and cleaning. The dentist looks at everything and explains your options.
          </p>
        </Link>
      </li>
    </ul>
  );
}
