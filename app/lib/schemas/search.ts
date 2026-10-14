import { z } from 'zod';

import { priceTypes, type Price } from './price';

import type { Coordinates } from '../search/location';

/*
 * `GET /search/specialists` (public, AGENTS.md §5): the specialists visible
 * around a point, the first free day first and then the nearest, each
 * with their nearest office and its next days — the available ones and
 * the full ones of that stretch. The page reads it on the server and the
 * browser through the web's own `/api/search`; both parse it here.
 */

const searchPriceSchema = z.object({
  amount: z.number(),
  currency: z.string(),
  priceType: z.enum(priceTypes),
});

const searchResultSchema = z.object({
  specialistId: z.string(),
  displayName: z.string(),
  photoUrl: z.string().nullable().catch(null),
  isVerified: z.boolean(),
  // A price shaped in a way this version does not know reads as no price.
  minPrice: searchPriceSchema.nullable().catch(null),
  specialties: z.array(z.object({ id: z.string(), name: z.string() })),
  nearestOffice: z.object({
    id: z.string(),
    name: z.string(),
    address: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    distanceMeters: z.number(),
    officeCount: z.number(),
  }),
  rating: z.number().nullable().catch(null),
  reviewCount: z.number(),
  nextAvailableDays: z.array(
    z.object({
      date: z.string(),
      officeId: z.string(),
      available: z.boolean(),
    }),
  ),
});

export const searchResponseSchema = z.object({
  data: z.array(searchResultSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
    radiusMeters: z.number().nullable(),
  }),
});

export type SearchResponse = z.output<typeof searchResponseSchema>;

export type SearchResultDay = {
  date: string;
  officeId: string;
  available: boolean;
};

export type SearchResult = {
  id: string;
  name: string;
  photoUrl: string | null;
  verified: boolean;
  /** The lowest of the specialist's prices, in the shape every price has. */
  price: Price | null;
  specialties: { id: string; name: string }[];
  /** The office nearest the point searched from, and how many there are. */
  office: {
    id: string;
    name: string;
    address: string;
    coordinates: Coordinates;
    distanceMeters: number;
    count: number;
  };
  rating: { average: number | null; count: number };
  /** The nearest office's next days: the free ones and the full ones among them. */
  days: SearchResultDay[];
};

export type SearchPage = {
  results: SearchResult[];
  total: number;
  page: number;
  totalPages: number;
  /** What the API searched within; null is the whole country. */
  radiusMeters: number | null;
};

/**
 * The lowest price as a `Price`: a fixed one or a «desde» as they are; a
 * range's low end reads as a «desde» too, as the app's card writes it.
 */
function toPrice(
  minPrice: z.output<typeof searchPriceSchema> | null,
): Price | null {
  if (minPrice === null) return null;
  const base = { currency: minPrice.currency };
  switch (minPrice.priceType) {
    case 'FIXED':
      return { ...base, type: 'FIXED', amount: minPrice.amount };
    case 'FROM':
      return { ...base, type: 'FROM', amount: minPrice.amount };
    case 'RANGE':
      return { ...base, type: 'RANGE', minAmount: minPrice.amount };
  }
}

export function toSearchResult(
  item: z.output<typeof searchResultSchema>,
): SearchResult {
  const office = item.nearestOffice;
  return {
    id: item.specialistId,
    name: item.displayName,
    photoUrl: item.photoUrl,
    verified: item.isVerified,
    price: toPrice(item.minPrice),
    specialties: item.specialties,
    office: {
      id: office.id,
      name: office.name,
      address: office.address,
      coordinates: { lat: office.latitude, lng: office.longitude },
      distanceMeters: office.distanceMeters,
      count: office.officeCount,
    },
    rating: { average: item.rating, count: item.reviewCount },
    days: item.nextAvailableDays.map((day) => ({
      date: day.date,
      officeId: day.officeId,
      available: day.available,
    })),
  };
}

export function toSearchPage(response: SearchResponse): SearchPage {
  return {
    results: response.data.map(toSearchResult),
    total: response.meta.total,
    page: response.meta.page,
    totalPages: response.meta.totalPages,
    radiusMeters: response.meta.radiusMeters,
  };
}
