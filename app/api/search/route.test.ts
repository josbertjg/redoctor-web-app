// @vitest-environment node
import { NextRequest } from 'next/server';

import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { searchResponseSchema } from '@/app/lib/schemas/search';

import { apiUrl } from '@/tests/msw/api-url';
import { server } from '@/tests/msw/server';

import { GET } from './route';
import { GET as suggestions } from './suggestions/route';

const request = (query: string) =>
  new NextRequest(`http://localhost:3000/api/search${query}`);

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
