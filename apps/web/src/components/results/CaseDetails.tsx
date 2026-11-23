import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight } from 'lucide-react';
import type { BeforeAfterCase } from '../../content/beforeAfter';
import { getService } from '../../content/services';

/** The active case under the stage: title, one line and a link to the treatment. */
export function CaseDetails({ item: c }: { item: BeforeAfterCase }) {
  const { t } = useTranslation();
  const service = getService(c.treatment);
  return (
    <div key={c.id} className="rs-text flex flex-wrap items-start justify-between gap-x-8 gap-y-4" aria-live="polite">
      <div className="min-w-0 max-w-md">
        <h3 className="font-display text-[1.375rem] leading-tight text-ink">{c.title}</h3>
        <p className="mt-1.5 text-[0.9375rem]">{c.description}</p>
      </div>
      <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {service && (
          <div className="flex items-center">
            <dt className="sr-only">{t('beforeAfter.seeTreatment')}</dt>
            <dd>
              <Link to={`/services/${service.slug}`} className="inline-flex items-center gap-1 text-roha-700 underline decoration-roha-200 underline-offset-4 hover:decoration-roha-700">
                {service.shortName}<ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}
