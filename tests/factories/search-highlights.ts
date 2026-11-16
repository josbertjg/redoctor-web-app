import type {
  featuredSpecialistsResponseSchema,
  popularSpecialtiesResponseSchema,
} from '@/app/lib/schemas/search-highlights';

import { buildSearchResult } from './search';

import type { z } from 'zod';

type FeaturedResponseInput = z.input<typeof featuredSpecialistsResponseSchema>;
type FeaturedSpecialistInput = FeaturedResponseInput['data'][number];
type PopularResponseInput = z.input<typeof popularSpecialtiesResponseSchema>;

export const featuredIds = {
  second: 'b1b2b3b4-0000-4000-8000-000000000002',
} as const;

/**
 * One specialist of `GET /search/specialists/featured`: the search's own
 * card (REDOC-180). Without coordinates the API sends no distance.
 */
export function buildFeaturedSpecialist(
  overrides: Partial<FeaturedSpecialistInput> = {},
): FeaturedSpecialistInput {
  return { ...buildSearchResult(), ...overrides };
}

/** The best rated two, as the API orders them, with or without a point. */
export function buildFeaturedSpecialistsResponse({
  near = false,
  limit = 10,
  ...overrides
}: Partial<FeaturedResponseInput> & {
  near?: boolean;
  limit?: number;
} = {}): FeaturedResponseInput {
  const data = (
    overrides.data ?? [
      buildFeaturedSpecialist(),
      buildFeaturedSpecialist({
        specialistId: featuredIds.second,
        displayName: 'Luis Rojas',
        rating: 4.8,
        reviewCount: 20,
        minPrice: null,
        specialties: [{ id: 's1', name: 'Medicina General' }],
      }),
    ]
  ).map((item) => ({
    ...item,
    nearestOffice: {
      ...item.nearestOffice,
      distanceMeters: near ? item.nearestOffice.distanceMeters : null,
    },
  }));
  return {
    data: data.slice(0, limit),
    meta: { limit, radiusMeters: near ? 10_000 : null },
    ...(overrides.meta ? { meta: overrides.meta } : {}),
  };
}

/**
 * `GET /search/specialties/popular`: the catalog's specialties
 * (tests/factories/specialties.ts) as the API ranks them by demand, the
 * most booked first — not the catalog's order — with their path.
 */
const popularSpecialties = [
  { id: 's2', name: 'Cardiología', path: 'Medicina > Cardiología' },
  {
    id: 's3',
    name: 'Ginecología y Obstetricia',
    path: 'Medicina > Ginecología y Obstetricia',
  },
  { id: 's1', name: 'Medicina General', path: 'Medicina > Medicina General' },
  { id: 'root', name: 'Medicina', path: 'Medicina' },
];

export function buildPopularSpecialtiesResponse({
  count = popularSpecialties.length,
}: { count?: number } = {}): PopularResponseInput {
  return { data: popularSpecialties.slice(0, count) };
}
