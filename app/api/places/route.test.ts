// @vitest-environment node
import { NextRequest } from 'next/server';

import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { placesRequestLimit } from '@/app/lib/data/places';
import { resetRateLimits } from '@/app/lib/security/rate-limit';

import { placeIds } from '@/tests/msw/handlers/places';
import { server } from '@/tests/msw/server';

import { GET as details } from './details/route';
import { GET as suggestions } from './suggestions/route';

const request = (path: string, address = '203.0.113.1') =>
  new NextRequest(`http://localhost:3000/api/places${path}`, {
    headers: { 'x-forwarded-for': address },
  });

const session = 'c0a8012f-3c4e-4b1a-9d2e-7f6a5b4c3d2e';

beforeEach(() => {
  resetRateLimits();
});

describe('GET /api/places/suggestions', () => {
  it('answers Google’s places in the web’s shape, uncached', async () => {
    const response = await suggestions(
      request(`/suggestions?input=mara&session=${session}`),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toEqual({
      places: [
        {
          id: placeIds.maracaibo,
          mainText: 'Maracaibo',
          secondaryText: 'Zulia, Venezuela',
        },
        {
          id: placeIds.maracay,
          mainText: 'Maracay',
          secondaryText: 'Aragua, Venezuela',
        },
      ],
    });
  });

  it('answers nothing for a text Google does not know', async () => {
    const response = await suggestions(
      request(`/suggestions?input=zzzz&session=${session}`),
    );
    expect(await response.json()).toEqual({ places: [] });
  });

  it('wants two letters and a session', async () => {
    expect(
      (await suggestions(request(`/suggestions?input=m&session=${session}`)))
        .status,
    ).toBe(400);
    expect((await suggestions(request('/suggestions?input=mara'))).status).toBe(
      400,
    );
  });

  it('says Google refused, without caching it', async () => {
    server.use(
      http.get(
        'https://maps.googleapis.com/maps/api/place/autocomplete/json',
        () =>
          HttpResponse.json({
            status: 'REQUEST_DENIED',
            predictions: [],
            error_message: 'The provided API key is invalid.',
          }),
      ),
    );
    const response = await suggestions(
      request(`/suggestions?input=mara&session=${session}`),
    );
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ code: 'ERR_PLACES' });
  });

  it('takes so many a minute from one address', async () => {
    for (let i = 0; i < placesRequestLimit.limit; i += 1) {
      const response = await suggestions(
        request(`/suggestions?input=mara&session=${session}`),
      );
      expect(response.status).toBe(200);
    }
    const refused = await suggestions(
      request(`/suggestions?input=mara&session=${session}`),
    );
    expect(refused.status).toBe(429);
    expect(refused.headers.get('Retry-After')).toBe('60');
    // Another address is another window.
    const other = await suggestions(
      request(`/suggestions?input=mara&session=${session}`, '203.0.113.2'),
    );
    expect(other.status).toBe(200);
  });
});

describe('GET /api/places/details', () => {
  it('answers the place’s point, rounded', async () => {
    const response = await details(
      request(`/details?id=${placeIds.maracaibo}&session=${session}`),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      coordinates: { lat: 10.65, lng: -71.64 },
    });
  });

  it('says when Google cannot place it', async () => {
    const response = await details(
      request(`/details?id=ChIJ-nowhere&session=${session}`),
    );
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ code: 'ERR_PLACE_NOT_FOUND' });
  });
});
