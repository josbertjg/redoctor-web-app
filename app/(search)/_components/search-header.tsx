import Link from 'next/link';

import { useTranslations } from 'next-intl';

import { routes } from '@/app/lib/routes';
import type { SearchQuery } from '@/app/lib/search/query';

import { SessionButton } from '@/app/ui/auth/session-button';
import { Logo } from '@/app/ui/logo';
import { NotificationsBell } from '@/app/ui/notifications/notifications-bell';
import type { SearchCatalog } from '@/app/ui/search/search-bar-types';
import { useSearchBarWords } from '@/app/ui/search/search-bar-words';

import { SearchHeaderBar } from './search-header-bar';
import { SearchProgress } from './search-navigation';

type SearchHeaderProps = {
  catalog: SearchCatalog;
  query: SearchQuery;
  specialtyName: string | null;
};

/*
 * The search page's bar: the logo, the search box with the search in hand
 * (as the app's summary pill, but editable in place) and the account.
 * It stays at the top as the results scroll, with the line that moves
 * while a new search is on its way.
 */
export function SearchHeader({
  catalog,
  query,
  specialtyName,
}: SearchHeaderProps) {
  const t = useTranslations();
  const words = useSearchBarWords();

  return (
    <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm vt-search-header">
      <div className="mx-auto flex w-full max-w-landing items-center gap-3 px-gutter pt-3 pb-2 sm:gap-4 sm:py-3">
        <Link
          href={routes.home()}
          aria-label={t('common.homeLabel')}
          className="-mx-1 inline-flex min-h-touch shrink-0 items-center rounded-lg px-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Logo tone="mark" className="h-7 sm:hidden" />
          <Logo preload className="hidden h-7 sm:block" />
        </Link>
        <SearchHeaderBar
          catalog={catalog}
          query={query}
          specialtyName={specialtyName}
          label={t('search.findSpecialists')}
          words={words}
        />
        {/* The bell and the account from tablets up: on a phone the box takes the bar. */}
        <NotificationsBell className="hidden sm:inline-flex" />
        <SessionButton className="hidden sm:inline-flex" />
      </div>
      <SearchProgress />
    </header>
  );
}
