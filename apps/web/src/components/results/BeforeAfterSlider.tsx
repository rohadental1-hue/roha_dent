import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { srcSet } from '../../lib/img';

type Props = {
  before: string;
  after: string;
  title: string;
  /** Handle position, 0–100 (% of the width showing "before"). */
  pos: number;
  onChange: (pos: number) => void;
  /** Called on the visitor's first drag, tap or key press (stops the hint and auto-advance). */
  onInteract: () => void;
  priority?: boolean;
  /** Image `sizes` for the slot the slider sits in. */
  sizes?: string;
};

const clamp = (n: number) => Math.min(100, Math.max(0, n));

/**
 * Drag-to-compare photo. Only horizontal drags move the handle: `touch-action: pan-y` leaves vertical
 * swipes to the page, so it never traps scrolling on phones. The handle is a role="slider" for
 * keyboard users (arrows, Home/End).
 */
export function BeforeAfterSlider({ before, after, title, pos, onChange, onInteract, priority, sizes = '(min-width: 1024px) 46rem, 100vw' }: Props) {
  const { t } = useTranslation();
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; on: boolean } | null>(null);

  const toPos = (clientX: number) => {
    const r = box.current!.getBoundingClientRect();
    return clamp(((clientX - r.left) / r.width) * 100);
  };

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, on: e.pointerType === 'mouse' };
    if (e.pointerType === 'mouse') {
      e.currentTarget.setPointerCapture(e.pointerId);
      onInteract();
      onChange(toPos(e.clientX));
    }
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    if (!d.on) {
      // touch/pen: commit to a drag only once the movement is clearly horizontal
      const dx = Math.abs(e.clientX - d.x);
      const dy = Math.abs(e.clientY - d.y);
      if (dx < 6 || dx < dy) return;
      d.on = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      onInteract();
    }
    onChange(toPos(e.clientX));
  };
  const up = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    // a tap (no drag) on touch moves the handle to that point
    if (d && !d.on && e.type === 'pointerup' && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6) {
      onInteract();
      onChange(toPos(e.clientX));
    }
  };

  const key = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 5;
    const next = { ArrowLeft: pos - step, ArrowRight: pos + step, ArrowDown: pos - step, ArrowUp: pos + step, Home: 0, End: 100 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    onInteract();
    onChange(clamp(next));
  };

  const imgProps = { width: 900, height: 600, decoding: 'async' as const, draggable: false, sizes,
    loading: priority ? ('eager' as const) : ('lazy' as const), fetchPriority: priority ? ('high' as const) : undefined };

  return (
    <div ref={box} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
      className="relative aspect-[3/2] cursor-ew-resize touch-pan-y overflow-hidden rounded-[10px] bg-roha-50 shadow-[0_24px_60px_-36px_rgb(15_35_80/0.55)] ring-1 ring-line select-none">
      <img src={after} srcSet={srcSet(after, 900)} alt={t('beforeAfter.afterAlt', { title })} {...imgProps}
        className="absolute inset-0 size-full object-cover" />
      <img src={before} srcSet={srcSet(before, 900)} alt={t('beforeAfter.beforeAlt')} {...imgProps}
        className="absolute inset-0 size-full object-cover" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} />

      <span className="pointer-events-none absolute top-3 left-3 rounded-full bg-white/25 px-3 py-1 text-xs font-medium text-white ring-1 ring-white/40 backdrop-blur-md [text-shadow:0_1px_2px_rgb(0_0_0/0.35)]">
        {t('beforeAfter.before')}
      </span>
      <span className="pointer-events-none absolute top-3 right-3 rounded-full bg-white/25 px-3 py-1 text-xs font-medium text-white ring-1 ring-white/40 backdrop-blur-md [text-shadow:0_1px_2px_rgb(0_0_0/0.35)]">
        {t('beforeAfter.after')}
      </span>

      {/* divider line and handle */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white/90 shadow-[0_0_12px_rgb(0_0_0/0.25)]" style={{ left: `${pos}%` }} />
      <span role="slider" tabIndex={0} aria-label={t('beforeAfter.slider')} aria-valuemin={0} aria-valuemax={100}
        aria-valuenow={Math.round(pos)} aria-valuetext={`${Math.round(pos)}% before`} onKeyDown={key}
        className="absolute top-1/2 grid size-12 -translate-x-1/2 -translate-y-1/2 grid-cols-2 place-items-center rounded-full bg-white text-roha-900 shadow-[0_6px_20px_-6px_rgb(15_35_80/0.5)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-white"
        style={{ left: `${pos}%` }}>
        <ChevronLeft className="-mr-1 size-4" aria-hidden="true" />
        <ChevronRight className="-ml-1 size-4" aria-hidden="true" />
      </span>
    </div>
  );
}
