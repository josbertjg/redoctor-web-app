import { queryOptions } from '@tanstack/react-query';

import { apiFetch } from '../api/client';
import { isApiError, type ApiError } from '../api/errors';
import { myProfileResponseSchema, toMyProfile } from '../schemas/specialists';

import type { TokenHolder } from '../api/types';

export const specialistKeys = {
  myProfile: (userId: string) => ['specialists', 'profile', userId] as const,
};

const isMissing = (error: ApiError) => error.status === 404;

/**
 * The specialist's own profile, every specialty with its review (M14). One
 * with no professional profile yet gets a 404, part of the course: there is
 * nothing to show (`null`). It is edited in the app, so a visit reads it
 * again after a minute.
 */
export function myProfileQueryOptions(user: TokenHolder) {
  return queryOptions({
    queryKey: specialistKeys.myProfile(user.id),
    queryFn: async ({ signal }) => {
      try {
        return toMyProfile(
          await apiFetch({
            path: '/specialists/profile',
            token: await user.getToken(),
            schema: myProfileResponseSchema,
            expected: isMissing,
            signal,
          }),
        );
      } catch (error) {
        if (isApiError(error) && isMissing(error)) return null;
        throw error;
      }
    },
    staleTime: 60_000,
  });
}
