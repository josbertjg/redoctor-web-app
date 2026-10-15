import 'server-only';

import { apiFetch } from '../api/client';
import { searchResponseSchema } from '../schemas/search';
import { venezuelaCenter } from '../search/location';

/*
 * Every public profile (`/s/{id}`), for the sitemap: the one way a crawler
 * finds them, since the search page is not indexed (AGENTS.md §4). The API
 * lists specialists through its public search alone (`GET /search/specialists`,
 * §5), which wants a point and something to look for and matches it as a
 * substring of the specialists' and the specialties' names. So the list is
 * the union of five searches over the whole country, one per vowel: no name
 * and no specialty in Spanish lacks every one of them (a listing endpoint
 * of the API's would replace this; asked of Heyscar). Each page is read
 * once a day and shared by every visitor through the Data Cache; a search
 * that fails leaves the others' profiles in the list.
 */

export const publicProfilesTag = 'public-profiles';

/** A new profile reaches the sitemap within a day; crawlers read it less often. */
const REVALIDATE_SECONDS = 86_400;

/** The API's largest page. */
const PAGE_SIZE = 50;

/**
 * How many pages a letter may take: 150 specialists per vowel, at most 15
 * requests of the endpoint's 30 a minute from one address. Beyond that,
 * the API's listing is needed (and `generateSitemaps`).
 */
const MAX_PAGES = 3;

/** Together they reach every name; `search` matches by substring. */
const LETTERS = ['a', 'e', 'i', 'o', 'u'] as const;

/** A crawler can wait, a Vercel function cannot: short, and no second retry. */
const TIMEOUT_MS = 4000;

const RATE_LIMITED = 429;

function readPage(letter: string, page: number) {
  return apiFetch({
    path: '/search/specialists',
    query: {
      search: letter,
      lat: venezuelaCenter.lat,
      lng: venezuelaCenter.lng,
      page,
      limit: PAGE_SIZE,
    },
    schema: searchResponseSchema,
    next: { revalidate: REVALIDATE_SECONDS, tags: [publicProfilesTag] },
    timeoutMs: TIMEOUT_MS,
    maxRetries: 1,
    // The endpoint's own limit is a known answer here, not a defect to report.
    expected: (error) => error.status === RATE_LIMITED,
  });
}

/** The ids of every public profile the API lists, each once, in a stable order. */
export async function listPublicProfileIds(): Promise<string[]> {
  const ids = new Set<string>();
  await Promise.allSettled(
    LETTERS.map(async (letter) => {
      const first = await readPage(letter, 1);
      for (const item of first.data) ids.add(item.specialistId);
      const pages = Math.min(first.meta.totalPages, MAX_PAGES);
      for (let page = 2; page <= pages; page += 1) {
        const next = await readPage(letter, page);
        for (const item of next.data) ids.add(item.specialistId);
      }
    }),
  );
  return [...ids].sort();
}
