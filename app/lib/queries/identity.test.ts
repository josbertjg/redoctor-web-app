// @vitest-environment node
import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import { meQueryOptions } from './identity';
import { knownUserId } from '../../../tests/factories/identity';
import { validToken } from '../../../tests/msw/handlers/identity';
import { isApiError } from '../api/errors';

const client = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('meQueryOptions', () => {
  it('reads the account with the bearer and maps it', async () => {
    const account = await client().query(
      meQueryOptions({
        id: 'uid-1',
        getToken: () => Promise.resolve(validToken),
      }),
    );

    expect(account).toMatchObject({
      id: knownUserId,
      name: 'Ana Pérez',
      role: 'patient',
      patient: { exists: true, isComplete: true },
    });
  });

  it('fails as an ApiError when the token is not accepted', async () => {
    await expect(
      client().query(
        meQueryOptions({
          id: 'uid-2',
          getToken: () => Promise.resolve('expired'),
        }),
      ),
    ).rejects.toSatisfy((error) => isApiError(error) && error.status === 401);
  });
});
