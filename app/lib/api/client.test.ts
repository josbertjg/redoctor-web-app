// @vitest-environment node
import { delay, http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { apiUrl, errorEnvelope } from '@/tests/msw/api-url';
import { server } from '@/tests/msw/server';

import { apiFetch, buildApiUrl } from './client';
import { ApiError } from './errors';
import { setApiErrorReporter } from '../observability/report';

// Retries without waiting: the policy is tested in retry.test.ts.
vi.mock(import('./retry'), async (importOriginal) => ({
  ...(await importOriginal()),
  backoffDelay: () => 0,
}));

const pingSchema = z.object({ ok: z.boolean() });

async function failure(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error('Expected the request to fail');
}

afterEach(() => {
  setApiErrorReporter(undefined);
});

describe('buildApiUrl', () => {
  it('fills and encodes params and skips empty query values', () => {
    expect(
      buildApiUrl(
        '/scheduling/invitations/:token',
        { token: 'a/b c' },
        { origin: 'email-12', page: 1, empty: undefined },
      ),
    ).toBe(
      'https://api-dev.redoctorapp.com/api/v1/scheduling/invitations/a%2Fb%20c?origin=email-12&page=1',
    );
  });

  it('refuses a template with a missing param', () => {
    expect(() => buildApiUrl('/a/:id')).toThrow(/:id/);
  });
});

describe('apiFetch', () => {
  it('returns the body parsed with the contract', async () => {
    server.use(
      http.get(apiUrl('/ping'), () =>
        HttpResponse.json({ ok: true, extra: 1 }),
      ),
    );

    await expect(
      apiFetch({ path: '/ping', schema: pingSchema }),
    ).resolves.toEqual({ ok: true });
  });

  it('sends the bearer token and a JSON body', async () => {
    let seen: { auth: string | null; body: unknown } | undefined;
    server.use(
      http.post(apiUrl('/echo'), async ({ request }) => {
        seen = {
          auth: request.headers.get('authorization'),
          body: await request.json(),
        };
        return HttpResponse.json({ ok: true });
      }),
    );

    await apiFetch({
      method: 'POST',
      path: '/echo',
      body: { rating: 5 },
      token: 'id-token',
      schema: pingSchema,
    });

    expect(seen).toEqual({ auth: 'Bearer id-token', body: { rating: 5 } });
  });

  it('turns the error envelope into an ApiError with its code', async () => {
    server.use(
      http.get(apiUrl('/missing'), () =>
        HttpResponse.json(errorEnvelope('ERR_3030', 'not found'), {
          status: 404,
        }),
      ),
    );

    const error = await failure(
      apiFetch({ path: '/missing', schema: pingSchema }),
    );
    expect(error).toMatchObject({
      kind: 'http',
      status: 404,
      code: 'ERR_3030',
    });
  });

  it('retries a read on a transient failure', async () => {
    let calls = 0;
    server.use(
      http.get(apiUrl('/flaky'), () => {
        calls += 1;
        return calls < 3
          ? HttpResponse.json(errorEnvelope('ERR_9001', 'down'), {
              status: 503,
            })
          : HttpResponse.json({ ok: true });
      }),
    );

    await expect(
      apiFetch({ path: '/flaky', schema: pingSchema }),
    ).resolves.toEqual({ ok: true });
    expect(calls).toBe(3);
  });

  it('does not retry a read on a client error', async () => {
    let calls = 0;
    server.use(
      http.get(apiUrl('/bad'), () => {
        calls += 1;
        return HttpResponse.json(errorEnvelope('ERR_1001', 'bad'), {
          status: 400,
        });
      }),
    );

    await failure(apiFetch({ path: '/bad', schema: pingSchema }));
    expect(calls).toBe(1);
  });

  it('never repeats a write that may have landed', async () => {
    let calls = 0;
    server.use(
      http.post(apiUrl('/confirm'), () => {
        calls += 1;
        return HttpResponse.error();
      }),
    );

    const error = await failure(
      apiFetch({ method: 'POST', path: '/confirm', schema: pingSchema }),
    );
    expect(error.kind).toBe('uncertain');
    expect(calls).toBe(1);
  });

  it('does not retry a write the server answered with an error', async () => {
    let calls = 0;
    server.use(
      http.post(apiUrl('/claim'), () => {
        calls += 1;
        return HttpResponse.json(errorEnvelope('ERR_9001', 'down'), {
          status: 503,
        });
      }),
    );

    const error = await failure(
      apiFetch({ method: 'POST', path: '/claim', schema: pingSchema }),
    );
    expect(error).toMatchObject({ kind: 'http', status: 503 });
    expect(calls).toBe(1);
  });

  it('reports a read that never answers as a timeout', async () => {
    server.use(
      http.get(apiUrl('/slow'), async () => {
        await delay(200);
        return HttpResponse.json({ ok: true });
      }),
    );

    const error = await failure(
      apiFetch({
        path: '/slow',
        schema: pingSchema,
        timeoutMs: 20,
        maxRetries: 0,
      }),
    );
    expect(error.kind).toBe('timeout');
  });

  it('reports unknown codes and broken contracts, never known ones', async () => {
    const reports: unknown[] = [];
    setApiErrorReporter((report) => reports.push(report));
    server.use(
      http.get(apiUrl('/unknown'), () =>
        HttpResponse.json(errorEnvelope('ERR_9001', 'boom'), { status: 400 }),
      ),
      http.get(apiUrl('/known'), () =>
        HttpResponse.json(errorEnvelope('ERR_5084', 'in review'), {
          status: 409,
        }),
      ),
      http.get(apiUrl('/broken'), () => HttpResponse.json({ ok: 'yes' })),
    );

    await failure(apiFetch({ path: '/unknown', schema: pingSchema }));
    await failure(apiFetch({ path: '/known', schema: pingSchema }));
    const broken = await failure(
      apiFetch({ path: '/broken', schema: pingSchema }),
    );

    expect(broken.kind).toBe('invalid-response');
    expect(reports).toEqual([
      {
        method: 'GET',
        path: '/unknown',
        status: 400,
        code: 'ERR_9001',
        kind: 'http',
      },
      {
        method: 'GET',
        path: '/broken',
        status: 200,
        code: undefined,
        kind: 'invalid-response',
      },
    ]);
  });

  it('stops when the caller cancels', async () => {
    server.use(
      http.get(apiUrl('/cancel'), async () => {
        await delay(200);
        return HttpResponse.json({ ok: true });
      }),
    );
    const controller = new AbortController();
    const request = apiFetch({
      path: '/cancel',
      schema: pingSchema,
      signal: controller.signal,
    });
    controller.abort();

    expect((await failure(request)).kind).toBe('aborted');
  });
});
