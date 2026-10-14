'use client';

import type { SearchQuery } from '@/app/lib/search/query';

import { SearchBar } from '@/app/ui/search/search-bar';
import type {
  SearchBarWords,
  SearchCatalog,
} from '@/app/ui/search/search-bar-types';

import { useSearchNavigation } from './search-navigation';

/** The search box of the page, handing each search to the page's navigation. */
export function SearchHeaderBar({
  catalog,
  query,
  specialtyName,
  label,
  words,
}: {
  catalog: SearchCatalog;
  query: SearchQuery;
  specialtyName: string | null;
  label: string;
  words: SearchBarWords;
}) {
  const { navigate } = useSearchNavigation();
  return (
    <SearchBar
      variant="page"
      label={label}
      words={words}
      catalog={catalog}
      initialQuery={query}
      initialSpecialtyName={specialtyName}
      onSearch={navigate}
      className="min-w-0 flex-1"
    />
  );
}
