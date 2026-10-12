import { queryOptions } from '@tanstack/react-query';

import { apiFetch } from '../api/client';
import { meResponseSchema, toAccount, type Account } from '../schemas/identity';

/*
 * The signed-in person's account, read in the browser with their Firebase
 * token (AGENTS.md §4, §9). Keyed by the Firebase uid, so a different person
 * in the same tab never sees the previous one's answer; the session provider
 * clears the whole cache on sign-out anyway.
 */

export const identityKeys = {
  me: (userId: string) => ['identity', 'me', userId] as const,
};

type TokenHolder = {
  id: string;
  getToken: () => Promise<string>;
};

export function meQueryOptions(user: TokenHolder) {
  return queryOptions({
    queryKey: identityKeys.me(user.id),
    queryFn: async ({ signal }): Promise<Account> => {
      const token = await user.getToken();
      const me = await apiFetch({
        path: '/identity/me',
        token,
        schema: meResponseSchema,
        signal,
      });
      return toAccount(me);
    },
    // Facets change in the app, rarely while the web is open.
    staleTime: 5 * 60_000,
  });
}
