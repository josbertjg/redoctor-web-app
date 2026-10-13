import { queryOptions } from '@tanstack/react-query';

import { apiFetch } from '../api/client';
import { granularityFor, type DateRange } from '../reports/period';
import { specialistReportSchema } from '../schemas/reports';

import type { TokenHolder } from '../api/types';

/*
 * The specialist's statistics (M14), read in the browser with their token
 * (AGENTS.md §4): one call brings the four sections, as the app reads them.
 * The buckets follow the period's length; the office is optional.
 */

export type ReportRequest = DateRange & {
  officeId?: string | undefined;
};

export const reportKeys = {
  specialist: (userId: string, request: ReportRequest) =>
    ['report', 'specialist', userId, request] as const,
};

export function specialistReportQueryOptions(
  user: TokenHolder,
  request: ReportRequest,
) {
  return queryOptions({
    queryKey: reportKeys.specialist(user.id, request),
    queryFn: async ({ signal }) =>
      apiFetch({
        path: '/reports/specialist',
        query: {
          from: request.from,
          to: request.to,
          granularity: granularityFor(request),
          officeId: request.officeId,
        },
        token: await user.getToken(),
        schema: specialistReportSchema,
        signal,
      }),
    // The app reads it again when it is more than 5 minutes old.
    staleTime: 5 * 60_000,
  });
}
