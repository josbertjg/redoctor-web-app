'use client';

import type { ReactNode } from 'react';

import LocationOn from '@material-symbols/svg-400/rounded/location_on.svg?svgr';

import type { Office } from '@/app/lib/schemas/offices';

import { Icon } from '@/app/ui/icons';
import { Skeleton } from '@/app/ui/skeleton';

import { OfficeLoadError } from './office-load-error';

import type { UseQueryResult } from '@tanstack/react-query';

/*
 * What «Mi perfil» reads office by office (the rates, the hours): a card
 * per office that has something to show — the app leaves the others out —,
 * its room held while it loads, its failure said in its place, and the
 * section's own words when no office has anything yet. Data already read
 * stays on screen if a later read fails.
 */
export function OfficeResults<T>({
  offices,
  results,
  shows,
  errorMessage,
  empty,
  children,
}: {
  offices: readonly Office[];
  /** One per office, in the same order (`useQueries`). */
  results: readonly UseQueryResult<T>[];
  /** Whether an office's answer has something to show. */
  shows: (data: T) => boolean;
  errorMessage: (office: Office) => string;
  empty: ReactNode;
  children: (office: Office, data: T) => ReactNode;
}) {
  const items = offices.flatMap((office, index) => {
    const result = results[index];
    if (result === undefined) return [];
    if (result.data !== undefined && !shows(result.data)) return [];
    return [{ office, result }];
  });

  if (items.length === 0) return empty;

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map(({ office, result }) => (
        <li key={office.id} className="min-w-0">
          {result.data !== undefined ? (
            children(office, result.data)
          ) : result.isError ? (
            <OfficeLoadError
              message={errorMessage(office)}
              retrying={result.isFetching}
              onRetry={() => {
                void result.refetch();
              }}
            />
          ) : (
            <Skeleton className="h-32 rounded-xl" />
          )}
        </li>
      ))}
    </ul>
  );
}

/** One office's card in a section: its name, a badge, and what it holds. */
export function OfficeCard({
  name,
  badge,
  children,
}: {
  name: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full animate-fade-in flex-col gap-3 rounded-xl border border-divider p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-1 text-label-lg text-text-primary">
          <Icon icon={LocationOn} size={18} className="shrink-0 text-primary" />
          <span className="truncate">{name}</span>
        </p>
        {badge}
      </div>
      {children}
    </div>
  );
}
