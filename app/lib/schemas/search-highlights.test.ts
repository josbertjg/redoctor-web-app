import { describe, expect, it } from 'vitest';

import {
  buildFeaturedSpecialistsResponse,
  buildPopularSpecialtiesResponse,
} from '@/tests/factories/search-highlights';

import {
  featuredSpecialistsResponseSchema,
  popularSpecialtiesResponseSchema,
  toFeaturedSpecialists,
  toPopularSpecialties,
} from './search-highlights';

describe('featuredSpecialistsResponseSchema', () => {
  it('reads each specialist as the search’s card, and the ring the list needed', () => {
    const featured = toFeaturedSpecialists(
      featuredSpecialistsResponseSchema.parse(
        buildFeaturedSpecialistsResponse({ near: true }),
      ),
    );

    expect(featured.radiusMeters).toBe(10_000);
    expect(featured.specialists.map((specialist) => specialist.name)).toEqual([
      'Ana Pérez',
      'Luis Rojas',
    ]);
    expect(featured.specialists[0]).toMatchObject({
      verified: true,
      price: { type: 'FIXED', amount: 45 },
      rating: { average: 4.5, count: 12 },
      office: { name: 'Clínica El Ávila', distanceMeters: 3200, count: 2 },
    });
  });

  it('reads a list without a point: the national ranking, with no distance', () => {
    const featured = toFeaturedSpecialists(
      featuredSpecialistsResponseSchema.parse(
        buildFeaturedSpecialistsResponse(),
      ),
    );

    expect(featured.radiusMeters).toBeNull();
    expect(
      featured.specialists.map(
        (specialist) => specialist.office.distanceMeters,
      ),
    ).toEqual([null, null]);
  });
});

describe('popularSpecialtiesResponseSchema', () => {
  it('reads the specialties in the API’s order, as the box and the chips offer them', () => {
    expect(
      toPopularSpecialties(
        popularSpecialtiesResponseSchema.parse(
          buildPopularSpecialtiesResponse(),
        ),
      ),
    ).toEqual([
      { id: 's2', name: 'Cardiología' },
      { id: 's3', name: 'Ginecología y Obstetricia' },
      { id: 's1', name: 'Medicina General' },
      { id: 'root', name: 'Medicina' },
    ]);
  });
});
