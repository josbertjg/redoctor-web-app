import 'server-only';

import { apiFetch } from '../api/client';
import { searchResponseSchema, type SearchResponse } from '../schemas/search';

import type { SearchRequest, SuggestionsRequest } from '../search/query';

/*
 * Server-side readers of the public search (`GET /search/specialists`,
 * AGENTS.md §5), for the page rendered on the server and for the web's own
 * `/api/search`, which the browser calls (the API's CORS is closed, and
 * the endpoint takes 30 requests a minute from one address: from Vercel,
 * every visitor is one address). Both go through the Data Cache, so the
 * same search in the same minute costs the API one request.
 */

export const searchTag = 'search';

/** A search: a minute, as a schedule can change under it. */
const SEARCH_REVALIDATE_SECONDS = 60;

/** The names that match a text change when a specialist joins: five minutes. */
const SUGGESTIONS_REVALIDATE_SECONDS = 300;

export async function searchSpecialists(
  request: SearchRequest,
): Promise<SearchResponse> {
  return apiFetch({
    path: '/search/specialists',
    query: request,
    schema: searchResponseSchema,
    next: { revalidate: SEARCH_REVALIDATE_SECONDS, tags: [searchTag] },
  });
}

export async function suggestSpecialists(
  request: SuggestionsRequest,
): Promise<SearchResponse> {
  return apiFetch({
    path: '/search/specialists',
    query: request,
    schema: searchResponseSchema,
    next: { revalidate: SUGGESTIONS_REVALIDATE_SECONDS, tags: [searchTag] },
  });
}
