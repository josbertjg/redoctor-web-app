import { describe, expect, it } from 'vitest';

import {
  buildSearchResponse,
  buildSearchResult,
} from '@/tests/factories/search';

import { searchResponseSchema, toSearchPage } from './search';

describe('searchResponseSchema', () => {
  it('reads the API’s page', () => {
    const parsed = searchResponseSchema.safeParse(buildSearchResponse());
    expect(parsed.success).toBe(true);
  });

  it('reads a price it does not know as no price, and a broken rating as none', () => {
    const parsed = searchResponseSchema.parse(
      buildSearchResponse({
        data: [
          buildSearchResult({
            minPrice: {
              amount: 10,
              currency: 'USD',
              priceType: 'HOURLY' as 'FIXED',
            },
            rating: 'five' as unknown as number,
          }),
        ],
      }),
    );
    expect(parsed.data[0]?.minPrice).toBeNull();
    expect(parsed.data[0]?.rating).toBeNull();
  });
});

describe('toSearchPage', () => {
  it('shapes a result as the card reads it', () => {
    const page = toSearchPage(
      searchResponseSchema.parse(buildSearchResponse()),
    );
    expect(page).toMatchObject({
      total: 1,
      page: 1,
      totalPages: 1,
      radiusMeters: null,
    });
    const [result] = page.results;
    expect(result).toMatchObject({
      name: 'Ana Pérez',
      verified: true,
      price: { type: 'FIXED', currency: 'USD', amount: 45 },
      office: {
        name: 'Clínica El Ávila',
        coordinates: { lat: 10.4965, lng: -66.8487 },
        distanceMeters: 3200,
        count: 2,
      },
      rating: { average: 4.5, count: 12 },
    });
    expect(result?.days.map((day) => day.available)).toEqual([
      true,
      false,
      true,
    ]);
  });

  it('reads a range’s low end as a «desde»', () => {
    const page = toSearchPage(
      searchResponseSchema.parse(
        buildSearchResponse({
          data: [
            buildSearchResult({
              minPrice: { amount: 25, currency: 'USD', priceType: 'RANGE' },
            }),
          ],
        }),
      ),
    );
    expect(page.results[0]?.price).toEqual({
      type: 'RANGE',
      currency: 'USD',
      minAmount: 25,
    });
  });
});
