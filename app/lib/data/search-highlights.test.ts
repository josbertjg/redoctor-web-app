// @vitest-environment node
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { apiUrl } from '@/tests/msw/api-url';
import { server } from '@/tests/msw/server';

import {
  featuredSpecialistsLimit,
  getFeaturedSpecialists,
  getPopularSpecialties,
  popularSpecialtiesLimit,
} from './search-highlights';

describe('getFeaturedSpecialists', () => {
  it('reads the national ranking when there is no point', async () => {
    let asked = new URLSearchParams();
    server.use(
      http.get(apiUrl('/search/specialists/featured'), ({ request }) => {
        asked = new URL(request.url).searchParams;
        return HttpResponse.json({
          data: [],
          meta: { limit: featuredSpecialistsLimit, radiusMeters: null },
        });
      }),
    );

    await expect(getFeaturedSpecialists(null)).resolves.toEqual({
      specialists: [],
      radiusMeters: null,
    });
    expect(Object.fromEntries(asked)).toEqual({
      limit: String(featuredSpecialistsLimit),
    });
  });

  it('reads the nearest first around a point, with how far each one is', async () => {
    const featured = await getFeaturedSpecialists({
      lat: 10.49,
      lng: -66.85,
    });

    expect(featured?.radiusMeters).toBe(10_000);
    expect(featured?.specialists[0]?.office.distanceMeters).toBe(3200);
  });

  it('answers nothing when the API cannot be read: the page stands without the list', async () => {
    server.use(
      http.get(apiUrl('/search/specialists/featured'), () =>
        HttpResponse.json({ code: 'ERR_1007' }, { status: 429 }),
      ),
    );

    await expect(getFeaturedSpecialists(null)).resolves.toBeNull();
  });
});

describe('getPopularSpecialties', () => {
  it('reads the most booked specialties, as many as every page offers', async () => {
    let limit: string | null = null;
    server.use(
      http.get(apiUrl('/search/specialties/popular'), ({ request }) => {
        limit = new URL(request.url).searchParams.get('limit');
        return HttpResponse.json({
          data: [
            { id: 's2', name: 'Cardiología', path: 'Medicina > Cardiología' },
          ],
        });
      }),
    );

    await expect(getPopularSpecialties()).resolves.toEqual([
      { id: 's2', name: 'Cardiología' },
    ]);
    expect(limit).toBe(String(popularSpecialtiesLimit));
  });

  it('answers nothing when the API cannot be read, so the page offers the catalog', async () => {
    server.use(
      http.get(apiUrl('/search/specialties/popular'), () =>
        HttpResponse.json({ code: 'ERR_1007' }, { status: 429 }),
      ),
    );

    await expect(getPopularSpecialties()).resolves.toBeNull();
  });
});
