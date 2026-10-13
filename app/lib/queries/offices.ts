import { queryOptions } from '@tanstack/react-query';

import { apiFetch } from '../api/client';
import { officesResponseSchema } from '../schemas/offices';

import type { TokenHolder } from '../api/types';

export const officeKeys = {
  mine: (userId: string) => ['offices', userId] as const,
};

/** The specialist's offices, to filter by (M14). They change in the app, rarely while the web is open. */
export function myOfficesQueryOptions(user: TokenHolder) {
  return queryOptions({
    queryKey: officeKeys.mine(user.id),
    queryFn: async ({ signal }) => {
      const { offices } = await apiFetch({
        path: '/specialists/offices',
        token: await user.getToken(),
        schema: officesResponseSchema,
        signal,
      });
      return offices;
    },
    staleTime: 5 * 60_000,
  });
}
