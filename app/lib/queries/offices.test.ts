import { QueryClient } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { officeId } from '@/tests/factories/appointments';

import {
  officePricingQueryOptions,
  officeScheduleQueryOptions,
} from './offices';
import { apiUrl } from '../../../tests/msw/api-url';
import { validToken } from '../../../tests/msw/handlers/identity';
import { server } from '../../../tests/msw/server';

const user = { id: 'uid-1', getToken: () => Promise.resolve(validToken) };

const missing = () =>
  HttpResponse.json(
    { code: 'ERR_3101', message: 'Not found' },
    { status: 404 },
  );

describe('an office’s rates and hours', () => {
  it('reads what a patient can book there, and when', async () => {
    const client = new QueryClient();

    const pricing = await client.query(
      officePricingQueryOptions(user, officeId),
    );
    const week = await client.query(officeScheduleQueryOptions(user, officeId));

    expect(pricing.reasons).toHaveLength(2);
    expect(week.groups).toHaveLength(2);
  });

  it('has nothing to show for an office with neither set yet', async () => {
    server.use(
      http.get(
        apiUrl('/specialists/offices/:officeId/pricing-config'),
        missing,
      ),
      http.get(apiUrl('/specialists/offices/:officeId/schedule'), missing),
    );
    const client = new QueryClient();

    await expect(
      client.query(officePricingQueryOptions(user, officeId)),
    ).resolves.toEqual({ mode: 'standard', reasons: [] });
    await expect(
      client.query(officeScheduleQueryOptions(user, officeId)),
    ).resolves.toEqual({ groups: [], slotMinutes: null });
  });
});
