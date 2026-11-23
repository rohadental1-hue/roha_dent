import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { stagger } from '../../lib/useReveal';
import { useTranslation } from 'react-i18next';
import type { BeforeAfterCase } from '../../content/beforeAfter';
import { BeforeAfterSlider } from './BeforeAfterSlider';
import { CaseList } from './CaseList';
import { CaseDetails } from './CaseDetails';

const ADVANCE_MS = 8000;
const reducedMotion = () => typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const preload = (c?: BeforeAfterCase) => c && [c.beforeImage, c.afterImage].forEach((src) => { new Image().src = src; });

/**
 * "Showcase stage": a large before/after slider with the cases listed beside it (below it on phones).
 * - Header, stage and case list wash in with the site's scroll reveal ([data-reveal]); once the section is
 *   in view, the slider hints that it can be dragged by nudging the handle.
 * - Cases advance every 8 s, shown by a bar on the active case. Hovering or focusing the section pauses it;
 *   choosing a case or using the slider stops it for good. Reduced motion: no nudge, no auto-advance.
 */
export function ResultsSection({ cases, id = 'results' }: { cases: BeforeAfterCase[]; id?: string }) {
  const { t } = useTranslation();
  const panelId = useId();
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState(50);
  const [shown, setShown] = useState(false); // has been on screen (starts the hint)
  const [inView, setInView] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [autoplay, setAutoplay] = useState(false); // turned on after the reveal unless reduced motion
  const touched = useRef(false);
  const nudge = useRef(0);

  const stopHint = () => cancelAnimationFrame(nudge.current);
  /** Any deliberate interaction: stop the hint and auto-advance, and fetch the next case's photos. */
  const interact = useCallback(() => {
    stopHint();
    setAutoplay(false);
    if (!touched.current) preload(cases[(active + 1) % cases.length]);
    touched.current = true;
  }, [active, cases]);

  const select = (i: number, byVisitor: boolean) => {
    if (byVisitor) interact();
    setActive(i);
    setPos(50);
    preload(cases[(i + 1) % cases.length]);
  };

  // reveal once, and track whether the section is on screen (auto-advance only runs while it is)
  useEffect(() => {
    const el = root.current;
    if (!el || !('IntersectionObserver' in window)) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => {
      setInView(e.isIntersecting);
      if (e.isIntersecting && e.intersectionRatio >= 0.25) setShown(true);
    }, { threshold: [0, 0.25] });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // after the reveal: nudge the handle 50 → 35 → 65 → 50 once, then start auto-advance
  useEffect(() => {
    if (!shown || reducedMotion()) return;
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
        setAutoplay(true);
        return;
      }
      const f = k - i;
      const e = f < 0.5 ? 2 * f * f : 1 - (-2 * f + 2) ** 2 / 2; // ease in-out
      setPos(stops[i] + (stops[i + 1] - stops[i]) * e);
      nudge.current = requestAnimationFrame(tick);
    };
    const start = window.setTimeout(() => { nudge.current = requestAnimationFrame(tick); }, 700); // after the stagger
    return () => { clearTimeout(start); stopHint(); };
  }, [shown]);

  const c = cases[active];
  const paused = hovered || focused || !inView;

  return (
    <section ref={root} id={id} aria-labelledby={`${panelId}-h`}
      className={paused ? 'rs-paused' : undefined}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHovered(true)} onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocused(false); }}>
      <header className="max-w-2xl">
        <p data-reveal className="text-sm font-medium text-roha-700">{t('beforeAfter.eyebrow')}</p>
        <h2 data-reveal style={stagger(1)} id={`${panelId}-h`} className="mt-3 text-h2">{t('beforeAfter.heading')}</h2>
        <p data-reveal style={stagger(2)} className="mt-4 text-lg">{t('beforeAfter.sub')}</p>
      </header>

      <div className="mt-[clamp(2rem,4vw,3rem)] grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-10">
        <div data-reveal style={stagger(3)} className="flex min-w-0 flex-col gap-6">
          <div id={panelId} role="tabpanel" aria-labelledby={`${panelId}-tab-${active}`}>
            <div key={c.id} className="rs-stage">
              <BeforeAfterSlider before={c.beforeImage} after={c.afterImage} title={c.title} pos={pos}
                onChange={setPos} onInteract={interact} priority={active === 0} />
            </div>
          </div>
          {/* phones and tablets: cases between the stage and the details */}
          <div className="lg:hidden">
            <CaseList cases={cases} active={active} onSelect={(i) => select(i, true)} autoplay={autoplay}
              onProgressEnd={() => select((active + 1) % cases.length, false)} panelId={panelId} idPrefix={`${panelId}-m`} ms={ADVANCE_MS} />
          </div>
          <CaseDetails item={c} />
        </div>

        <div data-reveal style={stagger(4)} className="max-lg:hidden">
          <CaseList cases={cases} active={active} onSelect={(i) => select(i, true)} autoplay={autoplay}
            onProgressEnd={() => select((active + 1) % cases.length, false)} panelId={panelId} idPrefix={panelId} ms={ADVANCE_MS} />
        </div>
      </div>

    </section>
  );
}
