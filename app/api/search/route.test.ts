// @vitest-environment node
import { NextRequest } from 'next/server';

import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

import { searchRequestLimit } from '@/app/lib/data/search';
import { searchResponseSchema } from '@/app/lib/schemas/search';
import { allowRequest, resetRateLimits } from '@/app/lib/security/rate-limit';

import { apiUrl } from '@/tests/msw/api-url';
import { server } from '@/tests/msw/server';

import { GET } from './route';
import { GET as suggestions } from './suggestions/route';

const request = (query: string, address?: string) =>
  new NextRequest(`http://localhost:3000/api/search${query}`, {
    ...(address ? { headers: { 'x-forwarded-for': address } } : {}),
  });

afterEach(() => {
  resetRateLimits();
});

describe('GET /api/search', () => {
  it('answers the API’s page for a search in the address', async () => {
    const response = await GET(
      request('?q=ana&lat=10.49&lng=-66.88&near=Caracas&radius=60&page=2'),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toContain('s-maxage=60');
    const page = searchResponseSchema.parse(await response.json());
    expect(page.meta).toMatchObject({ page: 2, radiusMeters: 60_000 });
    expect(page.data[0]?.displayName).toBe('Luis Rojas');
  });

  it('stops an address that spent its minute, its suggestions counted apart', async () => {
    const address = '203.0.113.9';
    for (let i = 0; i < searchRequestLimit.limit; i += 1) {
      allowRequest(`search:${address}`, searchRequestLimit);
    }

    const response = await GET(request('?q=ana', address));
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('60');
    expect(response.headers.get('Cache-Control')).toBe('no-store');

    const named = await suggestions(request('/suggestions?name=ana', address));
    expect(named.status).toBe(200);
  });

  it('refuses a search with nothing to look for', async () => {
    const response = await GET(request('?lat=10.49&lng=-66.88'));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ code: 'ERR_SEARCH_CRITERIA' });
  });

  it('says the API could not answer, without caching it', async () => {
    server.use(
      http.get(apiUrl('/search/specialists'), () =>
        HttpResponse.json(
          { code: 'ERR_1001', message: 'Validation failed' },
          { status: 400 },
        ),
      ),
    );
    const response = await GET(request('?q=ana'));
    expect(response.status).toBe(502);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toEqual({ code: 'ERR_1001' });
  });
});

describe('GET /api/search/suggestions', () => {
  it('answers the specialists whose name holds the text', async () => {
    const response = await suggestions(
      request('/suggestions?name=ana&lat=10.49&lng=-66.88&by=device'),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toContain('s-maxage=300');
    const page = searchResponseSchema.parse(await response.json());
    expect(page.data.map((item) => item.displayName)).toEqual(['Ana Pérez']);
  });

  it('wants two characters at least', async () => {
    const response = await suggestions(request('/suggestions?name=a'));
    expect(response.status).toBe(400);
  });
});
