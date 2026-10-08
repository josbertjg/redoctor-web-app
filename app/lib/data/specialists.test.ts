// @vitest-environment node
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { knownSpecialistId } from '@/tests/factories/specialists';
import { apiUrl, errorEnvelope } from '@/tests/msw/api-url';
import { server } from '@/tests/msw/server';

import { getSpecialistProfile } from './specialists';

// Retries without waiting: the policy is tested in api/retry.test.ts.
vi.mock(import('../api/retry'), async (importOriginal) => ({
  ...(await importOriginal()),
  backoffDelay: () => 0,
}));

describe('getSpecialistProfile', () => {
  it('reads the public profile', async () => {
    const profile = await getSpecialistProfile(knownSpecialistId);

    expect(profile).toMatchObject({ id: knownSpecialistId, name: 'Ana Pérez' });
  });

  it('answers null for a profile that does not exist', async () => {
    await expect(
      getSpecialistProfile('00000000-0000-4000-8000-000000000000'),
    ).resolves.toBeNull();
  });

  it('does not spend a request on an id that cannot exist', async () => {
    let calls = 0;
    server.use(
      http.get(apiUrl('/specialists/:specialistId/public-profile'), () => {
        calls += 1;
        return HttpResponse.json({}, { status: 500 });
      }),
    );

    await expect(getSpecialistProfile('not-a-uuid')).resolves.toBeNull();
    expect(calls).toBe(0);
  });

  it('lets any other failure reach the error boundary', async () => {
    server.use(
      http.get(apiUrl('/specialists/:specialistId/public-profile'), () =>
        HttpResponse.json(errorEnvelope('ERR_9001', 'down'), { status: 503 }),
      ),
    );

    await expect(getSpecialistProfile(knownSpecialistId)).rejects.toMatchObject(
      { kind: 'http', status: 503 },
    );
  });
});
