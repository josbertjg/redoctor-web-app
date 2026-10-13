import { useEffect, useRef } from 'react';

type InfiniteScrollOptions = {
  /** There is a next page, and none is on its way or failed. */
  enabled: boolean;
  /** Asks for the next page; called once each time the foot comes near. */
  onLoadMore: () => void;
  /**
   * How much the list holds: when it changes the foot is looked at again,
   * so a page that did not fill the screen asks for the next at once.
   */
  loaded: number;
};

/** How far below the screen the foot starts asking: the app's 240 points before the end. */
const reach = '0px 0px 240px 0px';

/**
 * A list that loads its next page by itself as its end comes into view
 * (the owner's call, 2026-10-13; the app's lists ask near the end of the
 * scroll). The returned ref goes on the list's foot. Each observer asks
 * once and stops: the next one waits for the page to land, so a page is
 * never asked for twice.
 */
export function useInfiniteScroll<T extends Element = HTMLDivElement>({
  enabled,
  onLoadMore,
  loaded,
}: InfiniteScrollOptions) {
  const foot = useRef<T>(null);
  const loadMore = useRef(onLoadMore);

  useEffect(() => {
    loadMore.current = onLoadMore;
  });

  useEffect(() => {
    const node = foot.current;
    if (
      !enabled ||
      node === null ||
      typeof IntersectionObserver === 'undefined'
    ) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        loadMore.current();
      },
      { rootMargin: reach },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, [enabled, loaded]);

  return foot;
}
