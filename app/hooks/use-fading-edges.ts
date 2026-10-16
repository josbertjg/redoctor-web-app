import { useEffect, useRef, useState } from 'react';

/** The sides of a row that scrolls sideways with more content beyond them. */
export type FadingEdges = 'none' | 'start' | 'end' | 'both';

/**
 * Follows a row that scrolls sideways (tabs, a strip of days) and says on
 * which sides there is more beyond the edge, for `fadingEdgesClass`
 * (app/ui/fading-edges.ts) to fade them: a cut item then reads as «there
 * is more», never as a mistake (the app's ScrollFadingEdges).
 */
export function useFadingEdges<Row extends HTMLElement>(enabled = true) {
  const ref = useRef<Row>(null);
  const [fade, setFade] = useState<FadingEdges>('none');

  useEffect(() => {
    const node = ref.current;
    // Without ResizeObserver (an old browser, a test) the row simply scrolls.
    if (!enabled || !node || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      const start = node.scrollLeft > 1;
      const end = node.scrollLeft + node.clientWidth < node.scrollWidth - 1;
      setFade(start && end ? 'both' : start ? 'start' : end ? 'end' : 'none');
    };
    // The observer measures once as it starts, then on every resize.
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    node.addEventListener('scroll', measure, { passive: true });
    return () => {
      observer.disconnect();
      node.removeEventListener('scroll', measure);
    };
  }, [enabled]);

  return { ref, fade };
}
