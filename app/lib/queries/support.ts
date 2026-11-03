import { queryOptions } from '@tanstack/react-query';

import { apiFetch } from '../api/client';
import {
  supportContactResponseSchema,
  toSupportContact,
} from '../schemas/support';

import type { SupportContact } from '../support';

/*
 * The support lines in the browser (REDOC-357), for the flows that show a
 * way to support after the page is up — a sheet, a payment that changed —,
 * as the app reads them: once, then again after an hour, and while it
 * never answered, again at 10 s, 30 s and 2 min. Public: no token.
 */

export const supportKeys = {
  contact: () => ['support', 'contact'] as const,
};

const retryDelays = [10_000, 30_000, 120_000];

export function supportContactQueryOptions() {
  return queryOptions({
    queryKey: supportKeys.contact(),
    queryFn: async ({ signal }): Promise<SupportContact> =>
      toSupportContact(
        await apiFetch({
          path: '/config/support',
          schema: supportContactResponseSchema,
          signal,
        }),
      ),
    staleTime: 60 * 60_000,
    retry: retryDelays.length,
    retryDelay: (attempt) => retryDelays[attempt] ?? 120_000,
  });
}
