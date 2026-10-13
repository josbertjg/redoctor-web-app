import { queryOptions } from '@tanstack/react-query';

import { apiFetch } from '../api/client';
import { isApiError, type ApiError } from '../api/errors';
import {
  noPricing,
  officesResponseSchema,
  pricingConfigSchema,
  toOfficePricing,
  toWeeklySchedule,
  weeklyScheduleSchema,
} from '../schemas/offices';

import type { TokenHolder } from '../api/types';

export const officeKeys = {
  mine: (userId: string) => ['offices', userId] as const,
  pricing: (userId: string, officeId: string) =>
    ['offices', userId, officeId, 'pricing'] as const,
  schedule: (userId: string, officeId: string) =>
    ['offices', userId, officeId, 'schedule'] as const,
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

const isMissing = (error: ApiError) => error.status === 404;

const officePath = (officeId: string, rest: string) =>
  `/specialists/offices/${encodeURIComponent(officeId)}/${rest}`;

/** What a patient can book at one office and at what price («Mi perfil»). */
export function officePricingQueryOptions(user: TokenHolder, officeId: string) {
  return queryOptions({
    queryKey: officeKeys.pricing(user.id, officeId),
    queryFn: async ({ signal }) => {
      try {
        return toOfficePricing(
          await apiFetch({
            path: officePath(officeId, 'pricing-config'),
            token: await user.getToken(),
            schema: pricingConfigSchema,
            expected: isMissing,
            signal,
          }),
        );
      } catch (error) {
        // An office with no rates set yet.
        if (isApiError(error) && isMissing(error)) return noPricing;
        throw error;
      }
    },
    staleTime: 60_000,
  });
}

/** One office's week of hours («Mi perfil»). */
export function officeScheduleQueryOptions(
  user: TokenHolder,
  officeId: string,
) {
  return queryOptions({
    queryKey: officeKeys.schedule(user.id, officeId),
    queryFn: async ({ signal }) => {
      try {
        return toWeeklySchedule(
          await apiFetch({
            path: officePath(officeId, 'schedule'),
            token: await user.getToken(),
            schema: weeklyScheduleSchema,
            expected: isMissing,
            signal,
          }),
        );
      } catch (error) {
        // An office with no hours set yet.
        if (isApiError(error) && isMissing(error)) {
          return { groups: [], slotMinutes: null };
        }
        throw error;
      }
    },
    staleTime: 60_000,
  });
}
