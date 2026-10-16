'use client';

import { useEffect, useState } from 'react';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { track } from '@/app/lib/analytics/track';
import { googleMapsAvailable } from '@/app/lib/maps/google-maps';
import { searchResultsQueryOptions } from '@/app/lib/queries/search';
import type { SearchPage } from '@/app/lib/schemas/search';
import { locationCoordinates } from '@/app/lib/search/location';
import {
  hasCriteria,
  searchQueryKey,
  type SearchQuery,
} from '@/app/lib/search/query';
import { cn } from '@/app/lib/utils';

import { Button } from '@/app/ui/button';
import { useReducedMotion } from '@/app/ui/motion';
import type { SearchCatalog } from '@/app/ui/search/search-bar-types';

import { useInfiniteScroll } from '@/app/hooks/use-infinite-scroll';

import { MapPanel } from './map-panel';
import { ResultCard, resultCardId } from './result-card';
import {
  ResultCardSkeleton,
  ResultsSkeleton,
  SearchEmpty,
  SearchFailed,
  SearchStart,
} from './results-states';
import { SearchFilters } from './search-filters';
import { useSearchNavigation } from './search-navigation';

type SearchResultsProps = {
  query: SearchQuery;
  specialtyName: string | null;
  /** The first page, read on the server; null when nothing was asked or it failed. */
  initialPage: SearchPage | null;
  catalog: SearchCatalog;
  today: string;
};

/*
 * The results of the search in the address: the filters, the count and
 * what was looked for and where, the cards — ten at a time, the next as
 * the list's end comes into view —, and the map beside them. The first
 * page comes with the HTML; the rest, and a first page the server could
 * not read, come through the web's own search (app/lib/queries/search.ts).
 * Changing the search changes the address: the page renders anew.
 */
export function SearchResults({
  query,
  specialtyName,
  initialPage,
  catalog,
  today,
}: SearchResultsProps) {
  const t = useTranslations();
  const { navigate, pending } = useSearchNavigation();
  const key = searchQueryKey(query);
  const asked = hasCriteria(query);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();
  // Another search: nothing is in hand any more.
  const [keyInHand, setKeyInHand] = useState(key);
  if (keyInHand !== key) {
    setKeyInHand(key);
    setActiveId(null);
    setSelectedId(null);
  }

  const results = useInfiniteQuery({
    ...searchResultsQueryOptions(query),
    ...(initialPage
      ? { initialData: { pages: [initialPage], pageParams: [1] } }
      : {}),
  });
  const pages = results.data?.pages ?? [];
  const items = pages.flatMap((page) => page.results);
  const total = pages[0]?.total ?? 0;
  const loaded = items.length;
  // A first page still on its way, none at all, or a next page that failed
  // (the ones read stay on screen with the way to try again).
  const loading = results.status === 'pending';
  const nothingRead =
    results.status === 'error' && !results.isFetchNextPageError;
  const nextPageFailed =
    results.status === 'error' && results.isFetchNextPageError;

  const foot = useInfiniteScroll({
    enabled:
      results.hasNextPage && !results.isFetchingNextPage && !results.isError,
    onLoadMore: () => {
      void results.fetchNextPage();
    },
    loaded,
  });

  // One event per search, once its count is known: never the words or the point.
  const counted = results.status === 'success';
  useEffect(() => {
    if (!asked || !counted) return;
    track('web_search_performed', {
      criterion: query.specialtyId === null ? 'text' : 'specialty',
      location: query.location.kind,
      results: total,
    });
    // The key says when the search changed; the rest comes with it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, asked, counted]);

  // A pin tapped: its card comes into view.
  useEffect(() => {
    if (selectedId === null) return;
    document.getElementById(resultCardId(selectedId))?.scrollIntoView({
      block: 'nearest',
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  }, [selectedId, reducedMotion]);

  if (!asked) return <SearchStart catalog={catalog} />;

  const point =
    query.location.kind === 'country'
      ? null
      : locationCoordinates(query.location);
  const criterion = specialtyName ?? query.text ?? '';
  const where =
    query.location.kind === 'place'
      ? t('search.web.nearPlace', { place: query.location.label })
      : query.location.kind === 'device'
        ? t('search.web.nearYou')
        : query.location.kind === 'area'
          ? t('search.web.inMapArea')
          : t('search.web.inCountry');
  const canWiden = query.location.kind !== 'country';
  // Without a map (no key, or nothing to pin) the list has the width.
  const withMap = googleMapsAvailable() && items.length > 0;

  return (
    <div className="mx-auto w-full max-w-landing px-gutter pt-3 pb-24 lg:pt-4 lg:pb-16">
      <SearchFilters
        query={query}
        today={today}
        onChange={(next) => {
          navigate(next, { scroll: false });
        }}
      />
      <div
        className={cn(
          'mt-4',
          withMap
            ? 'lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(20rem,42%)] lg:gap-6'
            : 'mx-auto max-w-content',
        )}
      >
        <section
          aria-label={t('search.web.resultsLabel')}
          aria-busy={pending || results.isPending || undefined}
          className={cn(
            'min-w-0 transition-opacity duration-base ease-house',
            pending && 'opacity-60',
          )}
        >
          {loading ? (
            <>
              <h1 className="sr-only">{t('search.web.searching')}</h1>
              <ResultsSkeleton />
            </>
          ) : nothingRead ? (
            <SearchFailed
              onRetry={() => {
                void results.refetch();
              }}
            />
          ) : items.length === 0 ? (
            <SearchEmpty
              canWiden={canWiden}
              onWiden={() => {
                navigate({
                  ...query,
                  location: { kind: 'country' },
                  radius: 'all',
                });
              }}
            />
          ) : (
            <>
              <header className="flex flex-col gap-1">
                <h1 className="text-headline-sm text-text-primary">
                  {t('search.web.title', { count: total })}
                </h1>
                <p className="text-body-md text-text-secondary">
                  {criterion ? `${criterion} · ` : ''}
                  {where}
                </p>
                <p className="text-body-sm text-text-secondary">
                  {t('search.web.sortedBy')}
                </p>
              </header>
              <ol className="mt-4 flex flex-col gap-3">
                {items.map((result) => (
                  <li key={result.id}>
                    <ResultCard
                      result={result}
                      showDistance={point !== null}
                      active={activeId === result.id}
                      selected={selectedId === result.id}
                      onHover={setActiveId}
                    />
                  </li>
                ))}
              </ol>
              <div ref={foot} className="mt-3 flex flex-col gap-3">
                {results.isFetchingNextPage ? (
                  <>
                    <ResultCardSkeleton />
                    <ResultCardSkeleton />
                  </>
                ) : nextPageFailed ? (
                  <div className="flex flex-col items-center gap-2 py-4 text-center">
                    <p className="text-body-md text-text-secondary">
                      {t('search.web.pageFailed')}
                    </p>
                    <Button
                      variant="white"
                      size="small"
                      onClick={() => {
                        void results.fetchNextPage();
                      }}
                    >
                      {t('retry')}
                    </Button>
                  </div>
                ) : !results.hasNextPage && loaded > 3 ? (
                  <p className="py-4 text-center text-body-sm text-text-secondary">
                    {t('search.web.endOfList')}
                  </p>
                ) : null}
              </div>
            </>
          )}
        </section>
        <MapPanel
          results={items}
          point={point}
          activeId={activeId}
          selectedId={selectedId}
          onHover={setActiveId}
          onSelect={setSelectedId}
          onSearchArea={(center, radius) => {
            navigate(
              {
                ...query,
                location: { kind: 'area', coordinates: center },
                radius,
              },
              { scroll: false },
            );
          }}
        />
      </div>
    </div>
  );
}
