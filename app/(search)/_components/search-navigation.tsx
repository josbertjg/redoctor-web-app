'use client';

import {
  createContext,
  useCallback,
  useContext,
  useTransition,
  type ReactNode,
} from 'react';

import { useRouter } from 'next/navigation';

import { routes } from '@/app/lib/routes';
import { toSearchParams, type SearchQuery } from '@/app/lib/search/query';

/*
 * One way to change the search on its page: the address. The box, the
 * filters and the map all ask here, the page renders the new address on
 * the server, and meanwhile everyone who asked can show they are waiting
 * (the results dim, the header's line moves).
 */

type SearchNavigation = {
  pending: boolean;
  navigate: (query: SearchQuery, options?: { scroll?: boolean }) => void;
};

const SearchNavigationContext = createContext<SearchNavigation | null>(null);

export function SearchNavigationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const navigate = useCallback<SearchNavigation['navigate']>(
    (query, { scroll = true } = {}) => {
      startTransition(() => {
        router.push(routes.search(toSearchParams(query)), { scroll });
      });
    },
    [router],
  );

  return (
    <SearchNavigationContext value={{ pending, navigate }}>
      {children}
    </SearchNavigationContext>
  );
}

export function useSearchNavigation(): SearchNavigation {
  const navigation = useContext(SearchNavigationContext);
  if (navigation === null) {
    throw new Error('useSearchNavigation needs a SearchNavigationProvider');
  }
  return navigation;
}

/** A thin line under the header that moves while a search is on its way. */
export function SearchProgress() {
  const { pending } = useSearchNavigation();
  return (
    <div aria-hidden="true" className="relative h-0.5 w-full overflow-hidden">
      <div
        className={`absolute inset-y-0 left-0 w-full origin-left bg-primary transition-opacity duration-fast ease-house ${
          pending ? 'animate-pulse opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}
