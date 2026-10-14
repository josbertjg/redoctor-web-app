import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';

import { searchSpecialists } from '@/app/lib/data/search';
import { getSearchCatalog } from '@/app/lib/data/specialties';
import { todayInCaracas } from '@/app/lib/format/date-of-birth';
import { pageNamespaces } from '@/app/lib/i18n/client-messages';
import { toSearchPage, type SearchPage } from '@/app/lib/schemas/search';
import {
  hasCriteria,
  parseSearchQuery,
  toSearchRequest,
} from '@/app/lib/search/query';
import { brandOpenGraph } from '@/app/lib/site';

import { MessagesScope } from '@/app/ui/messages-scope';
import { MotionProvider } from '@/app/ui/motion/provider';

import { SearchHeader } from '../_components/search-header';
import { SearchNavigationProvider } from '../_components/search-navigation';
import { SearchResults } from '../_components/search-results';

/*
 * `/search` (M16): the specialists a patient looks for, as the app's
 * «Buscar» and the search pages patients know. The search is in the
 * address — what, where, how far, from when — and the first page of
 * results comes with the HTML, read on the server (the API's search is
 * public and cached for every visitor); the rest is read in the browser
 * through the web's own `/api/search`. The web's own page, listed by no
 * app (AGENTS.md §6). Never indexed: an address says what someone looked
 * for and from where.
 */

export async function generateMetadata(): Promise<Metadata> {
  const [t, site] = await Promise.all([
    getTranslations('search.web'),
    getTranslations('metadata'),
  ]);
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    robots: { index: false, follow: false },
    openGraph: brandOpenGraph({
      title: t('metaTitle'),
      description: t('metaDescription'),
      siteName: site('siteName'),
      imageAlt: site('ogImageAlt'),
    }),
  };
}

export default async function SearchPage({
  searchParams,
}: PageProps<'/search'>) {
  const params = await searchParams;
  const today = todayInCaracas();
  const query = parseSearchQuery(params, today);
  const catalog = await getSearchCatalog();
  const specialtyName =
    catalog.find((specialty) => specialty.id === query.specialtyId)?.name ??
    null;

  // A first page the server cannot read is not the page's end: the browser
  // asks again, with «Reintentar» in hand (apiFetch reported it already).
  let initialPage: SearchPage | null = null;
  if (hasCriteria(query)) {
    try {
      initialPage = toSearchPage(
        await searchSpecialists(toSearchRequest(query, 1)),
      );
    } catch {
      initialPage = null;
    }
  }

  return (
    <MessagesScope namespaces={pageNamespaces.search}>
      <MotionProvider>
        <SearchNavigationProvider>
          <SearchHeader
            catalog={catalog}
            query={query}
            specialtyName={specialtyName}
          />
          <main className="flex flex-1 flex-col">
            <SearchResults
              query={query}
              specialtyName={specialtyName}
              initialPage={initialPage}
              catalog={catalog}
              today={today}
            />
          </main>
        </SearchNavigationProvider>
      </MotionProvider>
    </MessagesScope>
  );
}
