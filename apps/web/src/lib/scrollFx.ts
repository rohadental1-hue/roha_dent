import { useEffect } from 'react';

// Scroll-scrubbed effects ported from the reference design (roha-dental-site.zip).
// Both are driven by scroll position, so they play forwards and backwards, and both are
// skipped entirely with prefers-reduced-motion (the elements then simply sit at rest).

export const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const ease = (t: number) => 1 - Math.pow(1 - t, 3);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Runs `frame` on every scroll/resize (one per animation frame) while mounted. */
export function useScrollFrame(frame: () => (() => void) | void, deps: unknown[]) {
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let queued = false;
    let cleanup: (() => void) | void;
    const run = () => { cleanup = frame(); };
    const req = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; run(); });
    };
    window.addEventListener('scroll', req, { passive: true });
    window.addEventListener('resize', req);
    run();
    return () => {
      window.removeEventListener('scroll', req);
      window.removeEventListener('resize', req);
      cleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

