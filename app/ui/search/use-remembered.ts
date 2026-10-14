import { useSyncExternalStore } from 'react';

import {
  loadLastLocation,
  saveLastLocation,
} from '@/app/lib/search/last-location';
import type { SearchLocation } from '@/app/lib/search/location';
import {
  forgetSearch,
  loadRecentSearches,
  rememberSearch,
  saveRecentSearches,
  type RecentSearch,
} from '@/app/lib/search/recent';

/*
 * What this browser remembers for the search box, read as external stores
 * (the server knows nothing; the browser answers at once, hydration safe):
 * the last searches, and the last place searched from. A write notifies
 * every box on the page.
 */

type Store<T> = {
  read: () => T;
  subscribe: (onChange: () => void) => () => void;
  notify: () => void;
};

function createStore<T>(
  load: () => T,
  isSame: (a: T, b: T) => boolean,
): Store<T> {
  const listeners = new Set<() => void>();
  let cached: T | undefined;
  return {
    read: () => {
      const fresh = load();
      // The same value keeps the same reference, as useSyncExternalStore wants.
      if (cached === undefined || !isSame(cached, fresh)) cached = fresh;
      return cached;
    },
    subscribe: (onChange) => {
      listeners.add(onChange);
      return () => {
        listeners.delete(onChange);
      };
    },
    notify: () => {
      listeners.forEach((listener) => {
        listener();
      });
    },
  };
}

const sameJson = <T>(a: T, b: T) => JSON.stringify(a) === JSON.stringify(b);

const noRecent: RecentSearch[] = [];

const recentStore = createStore<RecentSearch[]>(loadRecentSearches, sameJson);

export function useRecentSearches() {
  const recent = useSyncExternalStore(
    recentStore.subscribe,
    recentStore.read,
    () => noRecent,
  );
  return {
    recent,
    remember: (entry: RecentSearch) => {
      saveRecentSearches(rememberSearch(recentStore.read(), entry));
      recentStore.notify();
    },
    forget: (entry: RecentSearch) => {
      saveRecentSearches(forgetSearch(recentStore.read(), entry));
      recentStore.notify();
    },
  };
}

const lastLocationStore = createStore<SearchLocation | null>(
  loadLastLocation,
  sameJson,
);

export function useLastLocation() {
  const last = useSyncExternalStore(
    lastLocationStore.subscribe,
    lastLocationStore.read,
    () => null,
  );
  return {
    last,
    keep: (location: SearchLocation) => {
      saveLastLocation(location);
      lastLocationStore.notify();
    },
  };
}
