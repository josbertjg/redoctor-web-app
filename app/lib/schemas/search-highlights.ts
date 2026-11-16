import { z } from 'zod';

import {
  searchResultSchema,
  toSearchResult,
  type SearchResult,
} from './search';

import type { SuggestibleSpecialty } from '../search/suggestions';

/*
 * The patient's highlights (REDOC-177; public, AGENTS.md §5), read on the
 * server for the landing and the search page:
 * - `GET /search/specialists/featured` (REDOC-180): the specialists visible
 *   in the search, those with three reviews or more ahead, then by rating,
 *   by consultations finished in the last 90 days and by distance; with a
 *   point, the nearest ring first (10, 50 and 300 km, then the country).
 *   Each one is the search's own card; without a point there is no
 *   distance, and the office is the specialist's first.
 * - `GET /search/specialties/popular` (REDOC-182): the specialties most
 *   booked in the last 90 days that some visible specialist practises,
 *   filled from the catalog when there is little to count; no figures.
 * The API orders both lists; the web never reorders them.
 */

export const featuredSpecialistsResponseSchema = z.object({
  data: z.array(searchResultSchema),
  meta: z.object({
    limit: z.number(),
    /** The ring the list needed; null without a point or past 300 km. */
    radiusMeters: z.number().nullable(),
  }),
});

export type FeaturedSpecialistsResponse = z.output<
  typeof featuredSpecialistsResponseSchema
>;

export type FeaturedSpecialists = {
  specialists: SearchResult[];
  /** Null when the list is the national ranking, or had to reach that far. */
  radiusMeters: number | null;
};

export function toFeaturedSpecialists(
  response: FeaturedSpecialistsResponse,
): FeaturedSpecialists {
  return {
    specialists: response.data.map(toSearchResult),
    radiusMeters: response.meta.radiusMeters,
  };
}

export const popularSpecialtiesResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      /** From the catalog's root: «Medicina General > Cardiología». */
      path: z.string(),
    }),
  ),
});

export type PopularSpecialtiesResponse = z.output<
  typeof popularSpecialtiesResponseSchema
>;

/** The specialties as the search box and the chips offer them: the name is enough. */
export function toPopularSpecialties(
  response: PopularSpecialtiesResponse,
): SuggestibleSpecialty[] {
  return response.data.map(({ id, name }) => ({ id, name }));
}
