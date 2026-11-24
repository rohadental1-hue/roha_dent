import { useEffect, useId, useRef, useState } from 'react';
import { stagger } from '../../lib/useReveal';
import { useTranslation } from 'react-i18next';
import type { BeforeAfterCase } from '../../content/beforeAfter';
import { BeforeAfterSlider } from './BeforeAfterSlider';
import { CaseDetails } from './CaseDetails';

const reducedMotion = () => typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const SIZES = '(min-width: 1024px) 24rem, (min-width: 768px) 45vw, 100vw';

/**
 * Results grid: every case is a card with its own drag-to-compare slider and details underneath.
 * One column on phones, two on tablets, three on desktop. Cards wash in with the site's scroll reveal
 * ([data-reveal]); once the section is in view, the first card nudges its handle once to show it can be
 * dragged (not with reduced motion, and never after the visitor has touched it).
 */
export function ResultsSection({ cases, id = 'results' }: { cases: BeforeAfterCase[]; id?: string }) {
  const { t } = useTranslation();
  const headingId = useId();
  const root = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  // reveal once: starts the first card's hint
  useEffect(() => {
    const el = root.current;
    if (!el || !('IntersectionObserver' in window)) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && e.intersectionRatio >= 0.25) {
        setShown(true);
        io.disconnect();
      }
    }, { threshold: [0, 0.25] });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={root} id={id} aria-labelledby={headingId}>
      <header className="max-w-2xl">
        <h2 data-reveal id={headingId} className="text-h2">{t('beforeAfter.heading')}</h2>
        <p data-reveal style={stagger(1)} className="mt-4 text-lg">{t('beforeAfter.sub')}</p>
      </header>

      <ul className="mt-[clamp(2rem,4vw,3rem)] grid grid-cols-1 gap-x-6 gap-y-10 md:grid-cols-2 lg:grid-cols-3 lg:gap-x-8">
        {cases.map((c, i) => (
          <li key={c.id} data-reveal style={stagger(i % 3)} className="min-w-0">
            <ResultCard item={c} hint={i === 0 && shown} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** One case: the slider (own handle position) and its title, line and treatment link. */
function ResultCard({ item: c, hint }: { item: BeforeAfterCase; hint: boolean }) {
  const [pos, setPos] = useState(50);
  const touched = useRef(false);
  const nudge = useRef(0);

  const interact = () => {
    cancelAnimationFrame(nudge.current);
    touched.current = true;
  };

  // nudge the handle 50 → 35 → 65 → 50 once
  useEffect(() => {
    if (!hint || reducedMotion()) return;
    const stops = [50, 35, 65, 50];
    const seg = 520;
    let t0 = 0;
    const tick = (now: number) => {
      if (touched.current) return;
      t0 ||= now;
      const k = (now - t0) / seg;
      const i = Math.floor(k);
      if (i >= stops.length - 1) {
        setPos(50);
        return;
      }
      const f = k - i;
      const e = f < 0.5 ? 2 * f * f : 1 - (-2 * f + 2) ** 2 / 2; // ease in-out
      setPos(stops[i] + (stops[i + 1] - stops[i]) * e);
      nudge.current = requestAnimationFrame(tick);
    };
    const start = window.setTimeout(() => { nudge.current = requestAnimationFrame(tick); }, 700); // after the stagger
    return () => { clearTimeout(start); cancelAnimationFrame(nudge.current); };
  }, [hint]);

  return (
    <article className="flex flex-col gap-5">
      <BeforeAfterSlider before={c.beforeImage} after={c.afterImage} title={c.title} pos={pos}
        onChange={setPos} onInteract={interact} sizes={SIZES} />
      <CaseDetails item={c} />
    </article>
  );
}
