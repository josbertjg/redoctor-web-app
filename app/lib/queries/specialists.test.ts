import { QueryClient } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { myProfileQueryOptions } from './specialists';
import { apiUrl } from '../../../tests/msw/api-url';
import { validToken } from '../../../tests/msw/handlers/identity';
import { server } from '../../../tests/msw/server';

const user = { id: 'uid-1', getToken: () => Promise.resolve(validToken) };

describe('myProfileQueryOptions', () => {
  it('reads the specialist’s own profile', async () => {
    const profile = await new QueryClient().query(myProfileQueryOptions(user));

    expect(profile?.name).toBe('Dr. Luis Gómez');
    expect(profile?.specialties[0]?.review).toBe('verified');
  });

  it('has nothing to show before the professional profile exists', async () => {
    server.use(
      http.get(apiUrl('/specialists/profile'), () =>
        HttpResponse.json(
          { code: 'ERR_3001', message: 'Specialist profile not found' },
          { status: 404 },
        ),
      ),
    );

    await expect(
      new QueryClient().query(myProfileQueryOptions(user)),
    ).resolves.toBeNull();
  });
});
