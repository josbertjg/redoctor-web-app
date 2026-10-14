import type { searchResponseSchema } from '@/app/lib/schemas/search';

import type { z } from 'zod';

type SearchResponseInput = z.input<typeof searchResponseSchema>;
type SearchResultInput = SearchResponseInput['data'][number];

export const searchIds = {
  specialist: 'a0af9566-a53d-4887-8d16-1dfc589c2f3d',
  office: 'ccf1f3ab-394a-4f03-8cf6-8615014a7433',
  specialty: 'a0000000-0000-4000-8000-000000000001',
} as const;

/** One specialist as `GET /search/specialists` lists them, near Caracas. */
export function buildSearchResult(
  overrides: Partial<SearchResultInput> = {},
): SearchResultInput {
  return {
    specialistId: searchIds.specialist,
    displayName: 'Ana Pérez',
    photoUrl: null,
    isVerified: true,
    minPrice: { amount: 45, currency: 'USD', priceType: 'FIXED' },
    specialties: [{ id: searchIds.specialty, name: 'Cardióloga' }],
    nearestOffice: {
      id: searchIds.office,
      name: 'Clínica El Ávila',
      address: 'Av. San Juan Bosco, Altamira, Caracas',
      latitude: 10.4965,
      longitude: -66.8487,
      distanceMeters: 3200,
      officeCount: 2,
    },
    rating: 4.5,
    reviewCount: 12,
    nextAvailableDays: [
      { date: '2026-10-15', officeId: searchIds.office, available: true },
      { date: '2026-10-16', officeId: searchIds.office, available: false },
      { date: '2026-10-19', officeId: searchIds.office, available: true },
    ],
    ...overrides,
  };
}

export function buildSearchResponse(
  overrides: Partial<SearchResponseInput> = {},
): SearchResponseInput {
  const data = overrides.data ?? [buildSearchResult()];
  return {
    data,
    meta: {
      total: data.length,
      page: 1,
      limit: 10,
      totalPages: 1,
      radiusMeters: null,
    },
    ...overrides,
  };
}
