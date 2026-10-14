// @vitest-environment node
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { buildPlans } from '@/tests/factories/billing';
import { apiUrl } from '@/tests/msw/api-url';
import { server } from '@/tests/msw/server';

import { forgetPlansRefusal, getLandingPlans } from './plans';

const refusing = (count: { calls: number }) =>
  http.get(apiUrl('/billing/plans'), () => {
    count.calls += 1;
    return HttpResponse.json(
      { code: 'ERR_1002', message: 'Missing authentication token' },
      { status: 401 },
    );
  });

describe('getLandingPlans', () => {
  beforeEach(() => {
    forgetPlansRefusal();
  });

  it('keeps the landing’s own plans while the API answers specialists only, asking once', async () => {
    const count = { calls: 0 };
    server.use(refusing(count));

    expect(await getLandingPlans()).toEqual({ status: 'private' });
    expect(await getLandingPlans()).toEqual({ status: 'private' });

    expect(count.calls).toBe(1);
  });

  it('asks the API again once the refusal is old', async () => {
    const count = { calls: 0 };
    server.use(refusing(count));
    const start = Date.now();

    await getLandingPlans(start);
    await getLandingPlans(start + 11 * 60_000);

    expect(count.calls).toBe(2);
  });

  it('reads the plans on offer, the cheapest first, when the API answers', async () => {
    server.use(
      http.get(apiUrl('/billing/plans'), () =>
        HttpResponse.json({ plans: buildPlans() }),
      ),
    );

    const result = await getLandingPlans();

    expect(result.status).toBe('offered');
    if (result.status !== 'offered') throw new Error('No plans');
    expect(result.plans.map((plan) => plan.slug)).toEqual([
      'esencial',
      'profesional',
      'corporativo',
    ]);
  });

  it('says the plans are unavailable when the API fails', async () => {
    server.use(
      http.get(apiUrl('/billing/plans'), () =>
        HttpResponse.json(
          { code: 'ERR_9999', message: 'Something broke' },
          { status: 500 },
        ),
      ),
    );

    expect(await getLandingPlans()).toEqual({ status: 'unavailable' });
  });
});
