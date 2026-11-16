import 'server-only';

import { searchTag } from './search';
import { apiFetch } from '../api/client';
import {
  featuredSpecialistsResponseSchema,
  popularSpecialtiesResponseSchema,
  toFeaturedSpecialists,
  toPopularSpecialties,
  type FeaturedSpecialists,
} from '../schemas/search-highlights';

import type { Coordinates } from '../search/location';
import type { SuggestibleSpecialty } from '../search/suggestions';

/*
 * The patient's highlights (REDOC-177) for what the server renders: the
 * landing and the search page with nothing asked. Public, and they share
 * the search's 30 requests a minute from one address — from the web's
 * server every visitor is one —, so the answers come from the Data Cache.
 * Neither is what a page waits on: the API asked once, briefly, and a
 * failure answers null, which each page handles (no list; the catalog in
 * place of the popular specialties). apiFetch reports what nobody expected.
 */

/** Two rows of three on a laptop; the same list for the landing and the search. */
export const featuredSpecialistsLimit = 6;

/** The most any page offers (the search page's start); the others take fewer. */
export const popularSpecialtiesLimit = 12;

/** The days each card offers move with the schedules: five minutes. */
const FEATURED_REVALIDATE_SECONDS = 300;

/** Ninety days of bookings hardly move in an hour. */
const POPULAR_REVALIDATE_SECONDS = 3600;

const HIGHLIGHTS_TIMEOUT_MS = 4000;

/**
 * The best rated specialists: the national ranking without a point, the
 * nearest first around one (already rounded to about a kilometre by the
 * search's address, so nearby visitors share the cached answer).
 */
export async function getFeaturedSpecialists(
  point: Coordinates | null,
): Promise<FeaturedSpecialists | null> {
  try {
    const response = await apiFetch({
      path: '/search/specialists/featured',
      query: {
        ...(point === null ? {} : { lat: point.lat, lng: point.lng }),
        limit: featuredSpecialistsLimit,
      },
      schema: featuredSpecialistsResponseSchema,
      next: { revalidate: FEATURED_REVALIDATE_SECONDS, tags: [searchTag] },
      timeoutMs: HIGHLIGHTS_TIMEOUT_MS,
      maxRetries: 0,
    });
    return toFeaturedSpecialists(response);
  } catch {
    return null;
  }
}

/** The most booked specialties, or null when they cannot be read. */
export async function getPopularSpecialties(): Promise<
  SuggestibleSpecialty[] | null
> {
  try {
    const response = await apiFetch({
      path: '/search/specialties/popular',
      query: { limit: popularSpecialtiesLimit },
      schema: popularSpecialtiesResponseSchema,
      next: { revalidate: POPULAR_REVALIDATE_SECONDS, tags: [searchTag] },
      timeoutMs: HIGHLIGHTS_TIMEOUT_MS,
      maxRetries: 0,
    });
    return toPopularSpecialties(response);
  } catch {
    return null;
  }
}
