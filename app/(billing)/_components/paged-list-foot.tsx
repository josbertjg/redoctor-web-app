'use client';

import type { ReactNode } from 'react';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/ui/button';

import { useInfiniteScroll } from '@/app/hooks/use-infinite-scroll';

type PagedListFootProps = {
  /** How many rows the list holds. */
  loaded: number;
  /** The next page is on its way. */
  loadingMore: boolean;
  /** The last try at the next page failed: what is shown stays. */
  failed: boolean;
  hasMore: boolean;
  /** Asks for the next page: by itself near the end, or from «Reintentar». */
  onMore: () => void;
  labels: { failed: string; end: string };
  /** A row in skeleton: the page that comes is announced by its shape. */
  skeleton: ReactNode;
};

/*
 * The foot of a list read a page at a time (the app's PagedListFooter):
 * the next page comes by itself as the end of the list comes into view
 * (infinite scroll, the owner's call), announced by rows in skeleton; a
 * failure stops there with «Reintentar», never retrying by itself; and the
 * end says there is no more.
 */
export function PagedListFoot({
  loaded,
  loadingMore,
  failed,
  hasMore,
  onMore,
  labels,
  skeleton,
}: PagedListFootProps) {
  const tRoot = useTranslations();
  const waiting = hasMore && !loadingMore && !failed;
  const foot = useInfiniteScroll({
    enabled: waiting,
    onLoadMore: onMore,
    loaded,
  });

  if (loadingMore) {
    return (
      <div aria-busy="true" className="flex flex-col gap-3">
        {skeleton}
        {skeleton}
      </div>
    );
  }
  if (failed) {
    return (
      <div className="flex animate-fade-in flex-col items-center gap-2 py-2">
        <p role="status" className="text-body-md text-text-secondary">
          {labels.failed}
        </p>
        <Button variant="white" shape="soft" onClick={onMore}>
          {tRoot('retry')}
        </Button>
      </div>
    );
  }
  if (waiting) {
    // Where the list ends: coming into view, it asks for the next page.
    return <div ref={foot} aria-hidden="true" className="h-px" />;
  }
  return (
    <p className="animate-fade-in py-2 text-center text-body-md text-text-secondary">
      {labels.end}
    </p>
  );
}
