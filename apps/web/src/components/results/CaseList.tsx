import { useEffect, useRef, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { BeforeAfterCase } from '../../content/beforeAfter';
import { srcSet } from '../../lib/img';

type Props = {
  cases: BeforeAfterCase[];
  active: number;
  /** Visitor picked a case (click or keys). */
  onSelect: (i: number) => void;
  /** Auto-advance is running: show the progress bar on the active case. */
  autoplay: boolean;
  /** The progress bar finished: move to the next case. */
  onProgressEnd: () => void;
  panelId: string;
  /** Prefix for the tab ids (the list is rendered twice: phones and desktop). */
  idPrefix: string;
  ms: number;
};

/**
 * The cases as tabs: a vertical list beside the stage on desktop, a row of chips that scrolls sideways
 * on phones and tablets. Arrow keys move between cases; the active chip scrolls itself into view.
 */
export function CaseList({ cases, active, onSelect, autoplay, onProgressEnd, panelId, idPrefix, ms }: Props) {
  const { t } = useTranslation();
  const list = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  // keep the active chip in view in the sideways row, without scrolling the page
  useEffect(() => {
    const row = list.current;
    const tab = tabs.current[active];
    if (!row || !tab || row.scrollWidth <= row.clientWidth) return;
    const left = tab.offsetLeft - (row.clientWidth - tab.offsetWidth) / 2;
    row.scrollTo({ left, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [active]);

  const key = (e: KeyboardEvent) => {
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    const to = step !== undefined ? (active + step + cases.length) % cases.length : e.key === 'Home' ? 0 : e.key === 'End' ? cases.length - 1 : -1;
    if (to < 0) return;
    e.preventDefault();
    onSelect(to);
    tabs.current[to]?.focus();
  };

  return (
    <div ref={list} role="tablist" aria-label={t('beforeAfter.choose')} onKeyDown={key}
      className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-px-4 px-4 py-1 [scrollbar-width:none] lg:mx-0 lg:max-h-[36rem] lg:snap-none lg:flex-col lg:gap-1.5 lg:overflow-x-visible lg:overflow-y-auto lg:px-0">
      {cases.map((c, i) => {
        const on = i === active;
        return (
          <button key={c.id} ref={(el) => { tabs.current[i] = el; }} type="button" role="tab" id={`${idPrefix}-tab-${i}`}
            aria-selected={on} aria-controls={panelId} tabIndex={on ? 0 : -1} onClick={() => onSelect(i)}
            className={`group relative flex shrink-0 snap-start items-center gap-3 overflow-hidden text-left transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky
              rounded-full p-1 pr-4 ring-1 lg:rounded-2xl lg:p-2.5 lg:pr-4
              ${on ? 'bg-roha-100 ring-roha-300' : 'bg-white ring-line hover:bg-roha-50 lg:ring-transparent'}`}>
            <img src={c.afterImage} srcSet={srcSet(c.afterImage, 900)} sizes="5rem" alt="" width={900} height={600} loading="lazy" decoding="async"
              className="aspect-square w-9 shrink-0 rounded-full object-cover lg:aspect-[3/2] lg:w-20 lg:rounded-lg" />
            <span className="min-w-0">
              <span className={`block text-sm leading-tight whitespace-nowrap lg:font-display lg:text-base ${on ? 'text-roha-900' : 'text-ink-soft group-hover:text-ink'}`}>{c.title}</span>
              <span className="mt-1 hidden truncate text-[0.8125rem] text-ink-soft lg:block">{c.description}</span>
            </span>
            {/* thin progress bar while cases advance on their own */}
            {on && autoplay && (
              <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-roha-200">
                <span key={c.id} className="rs-progress block h-full bg-roha-500" style={{ ['--rs-ms' as string]: `${ms}ms` }} onAnimationEnd={onProgressEnd} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
