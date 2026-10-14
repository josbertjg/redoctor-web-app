import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';

import { searchResponseSchema, toSearchPage } from '../schemas/search';
import {
  hasCriteria,
  searchQueryKey,
  toSearchParams,
  type SearchQuery,
} from '../search/query';
import {
  canSuggest,
  toSpecialistSuggestions,
  type SpecialistSuggestion,
} from '../search/suggestions';

import type { SearchLocation } from '../search/location';

/*
 * The search in the browser (M16): the pages after the first, the filters
 * and the map's «Buscar en esta zona» read through the web's own
 * `/api/search` (app/api/search), never the API itself — its CORS is
 * closed, and the web's server caches each search for every visitor. The
 * answer is the API's own, parsed with the same contract.
 */

export const searchKeys = {
  all: ['search'] as const,
  results: (key: string) => ['search', 'results', key] as const,
  suggestions: (name: string, lat: number, lng: number) =>
    ['search', 'suggestions', name, lat, lng] as const,
};

/** The web's own search answered with something other than a page. */
export class SearchUnavailableError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`The search answered ${String(status)}`);
    this.name = 'SearchUnavailableError';
    this.status = status;
  }
}

async function readSearch(
  path: '/api/search' | '/api/search/suggestions',
  params: URLSearchParams,
  signal: AbortSignal,
) {
  const url = new URL(path, window.location.origin);
  url.search = params.toString();
  const response = await fetch(url, {
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new SearchUnavailableError(response.status);
  return searchResponseSchema.parse(await response.json());
}

/** The pages of one search, ten at a time, as the list's end comes into view. */
export function searchResultsQueryOptions(query: SearchQuery) {
  return infiniteQueryOptions({
    queryKey: searchKeys.results(searchQueryKey(query)),
    queryFn: async ({ pageParam, signal }) => {
      const params = toSearchParams(query);
      params.set('page', String(pageParam));
      return toSearchPage(await readSearch('/api/search', params, signal));
    },
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page < last.totalPages ? last.page + 1 : undefined,
    staleTime: 60_000,
    enabled: hasCriteria(query),
  });
}

/** The app's suggestions: the specialists whose name holds the text, five of them. */
export function specialistSuggestionsQueryOptions(
  name: string,
  location: SearchLocation,
) {
  const trimmed = name.trim();
  const point = location.kind === 'country' ? null : location.coordinates;
  return queryOptions({
    queryKey: searchKeys.suggestions(trimmed, point?.lat ?? 0, point?.lng ?? 0),
    queryFn: async ({ signal }): Promise<SpecialistSuggestion[]> => {
      const params = toSearchParams({
        text: null,
        specialtyId: null,
        location,
        radius: 'all',
        from: null,
      });
      params.set('name', trimmed);
      return toSpecialistSuggestions(
        await readSearch('/api/search/suggestions', params, signal),
        trimmed,
      );
    },
    staleTime: 300_000,
    enabled: canSuggest(trimmed),
  });
}
