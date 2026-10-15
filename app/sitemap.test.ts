// @vitest-environment node
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import {
  buildSearchResponse,
  buildSearchResult,
} from '@/tests/factories/search';
import { apiUrl } from '@/tests/msw/api-url';
import { server } from '@/tests/msw/server';

import sitemap from './sitemap';

// Outside Next.js there is no request to wait for.
vi.mock('next/server', () => ({ connection: () => Promise.resolve() }));

vi.mock(import('@/app/lib/api/retry'), async (importOriginal) => ({
  ...(await importOriginal()),
  backoffDelay: () => 0,
}));

const statics = [
  'http://localhost:3000/',
  'http://localhost:3000/terms',
  'http://localhost:3000/privacy',
  'http://localhost:3000/delete-account',
];

describe('sitemap', () => {
  it('lists the public pages and every profile the API lists', async () => {
    const entries = await sitemap();

    expect(entries.map((entry) => entry.url)).toEqual([
      ...statics,
      'http://localhost:3000/s/a0af9566-a53d-4887-8d16-1dfc589c2f3d',
    ]);
    expect(entries.at(-1)).toMatchObject({
      changeFrequency: 'weekly',
      priority: 0.7,
    });
  });

  it('lists a profile once, whichever searches found it', async () => {
    server.use(
      http.get(apiUrl('/search/specialists'), () =>
        HttpResponse.json(
          buildSearchResponse({
            data: [
              buildSearchResult(),
              buildSearchResult({
                specialistId: 'b1b2b3b4-0000-4000-8000-000000000002',
              }),
            ],
          }),
        ),
      ),
    );

    const entries = await sitemap();

    expect(entries.map((entry) => entry.url)).toEqual([
      ...statics,
      'http://localhost:3000/s/a0af9566-a53d-4887-8d16-1dfc589c2f3d',
      'http://localhost:3000/s/b1b2b3b4-0000-4000-8000-000000000002',
    ]);
  });

  it('keeps the public pages when the API answers nothing', async () => {
    server.use(
      http.get(apiUrl('/search/specialists'), () =>
        HttpResponse.json(
          { code: 'ERR_9001', message: 'down' },
          { status: 503 },
        ),
      ),
    );

    const entries = await sitemap();

    expect(entries.map((entry) => entry.url)).toEqual(statics);
  });
});
