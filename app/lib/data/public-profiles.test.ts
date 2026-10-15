// @vitest-environment node
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import {
  buildSearchResponse,
  buildSearchResult,
} from '@/tests/factories/search';
import { apiUrl } from '@/tests/msw/api-url';
import { server } from '@/tests/msw/server';

import { listPublicProfileIds } from './public-profiles';

// Retries without waiting: the policy is tested in api/retry.test.ts.
vi.mock(import('../api/retry'), async (importOriginal) => ({
  ...(await importOriginal()),
  backoffDelay: () => 0,
}));

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

/** A search of the API that answers the ids given for a letter, 50 a page. */
function listing(
  byLetter: Record<string, string[]>,
  seen: { letter: string; page: number }[] = [],
) {
  return http.get(apiUrl('/search/specialists'), ({ request }) => {
    const params = new URL(request.url).searchParams;
    const letter = params.get('search') ?? '';
    const page = Number(params.get('page'));
    const limit = Number(params.get('limit'));
    seen.push({ letter, page });
    const ids = byLetter[letter] ?? [];
    const data = ids
      .slice((page - 1) * limit, page * limit)
      .map((specialistId) => buildSearchResult({ specialistId }));
    return HttpResponse.json(
      buildSearchResponse({
        data,
        meta: {
          total: ids.length,
          page,
          limit,
          totalPages: Math.ceil(ids.length / limit),
          radiusMeters: null,
        },
      }),
    );
  });
}

describe('listPublicProfileIds', () => {
  it('unites the searches of the five vowels over the whole country, each profile once', async () => {
    const seen: { letter: string; page: number }[] = [];
    server.use(
      listing(
        {
          a: [id(2), id(1)],
          e: [id(1), id(3)],
          i: [],
          o: [id(3)],
          u: [id(4)],
        },
        seen,
      ),
    );

    await expect(listPublicProfileIds()).resolves.toEqual([
      id(1),
      id(2),
      id(3),
      id(4),
    ]);
    expect(seen.map((call) => call.letter).sort()).toEqual([
      'a',
      'e',
      'i',
      'o',
      'u',
    ]);
    expect(seen.every((call) => call.page === 1)).toBe(true);
  });

  it('asks the API for a point, the largest page and nothing else', async () => {
    const urls: URL[] = [];
    server.use(
      http.get(apiUrl('/search/specialists'), ({ request }) => {
        urls.push(new URL(request.url));
        return HttpResponse.json(buildSearchResponse({ data: [] }));
      }),
    );

    await listPublicProfileIds();

    for (const url of urls) {
      expect([...url.searchParams.keys()].sort()).toEqual([
        'lat',
        'limit',
        'lng',
        'page',
        'search',
      ]);
      expect(url.searchParams.get('limit')).toBe('50');
      expect(url.searchParams.get('lat')).toBe('7.9');
      expect(url.searchParams.get('lng')).toBe('-66.1');
    }
  });

  it('reads the pages after the first, up to its cap', async () => {
    const seen: { letter: string; page: number }[] = [];
    const many = Array.from({ length: 180 }, (_, index) => id(index + 1));
    server.use(listing({ a: many }, seen));

    const ids = await listPublicProfileIds();

    // Three pages of fifty: the fourth stays unread (the API's listing then).
    expect(ids).toHaveLength(150);
    expect(
      seen.filter((call) => call.letter === 'a').map((c) => c.page),
    ).toEqual([1, 2, 3]);
  });

  it('keeps the profiles of the searches that answered when one fails', async () => {
    server.use(
      http.get(apiUrl('/search/specialists'), ({ request }) => {
        const letter = new URL(request.url).searchParams.get('search');
        if (letter === 'e') {
          return HttpResponse.json(
            { code: 'ERR_9000', message: 'Too many requests' },
            { status: 429 },
          );
        }
        return HttpResponse.json(
          buildSearchResponse({
            data: letter === 'a' ? [buildSearchResult()] : [],
          }),
        );
      }),
    );

    await expect(listPublicProfileIds()).resolves.toEqual([
      'a0af9566-a53d-4887-8d16-1dfc589c2f3d',
    ]);
  });

  it('answers nobody when the API is down', async () => {
    server.use(
      http.get(apiUrl('/search/specialists'), () =>
        HttpResponse.json(
          { code: 'ERR_9001', message: 'down' },
          { status: 503 },
        ),
      ),
    );

    await expect(listPublicProfileIds()).resolves.toEqual([]);
  });
});
