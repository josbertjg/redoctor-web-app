import { queryOptions } from '@tanstack/react-query';

import { apiFetch } from '../api/client';
import { isApiError } from '../api/errors';
import {
  favoriteResponseSchema,
  favoritesResponseSchema,
  removedFavoriteResponseSchema,
} from '../schemas/favorites';

import type { TokenHolder } from '../api/types';

export function isFavoriteSignUpNeeded(error: unknown): boolean {
  return isApiError(error) && error.status === 403 && error.code === 'ERR_2010';
}

/*
 * The patient's favourites, read and written in the browser with the
 * session (AGENTS.md §4): the ids of every specialist kept, and keeping or
 * letting one go — the profile's heart moves at once and the API is told
 * after (favorite-button.tsx).
 */

export const favoriteKeys = {
  list: (userId: string) => ['favorites', userId] as const,
};

/** A page holds 100 at most: ten of them cover any patient's list. */
const pageLimit = 100;
const maxPages = 10;

/** The ids of the patient's favourite specialists, every page read. */
export function favoritesQueryOptions(user: TokenHolder) {
  return queryOptions({
    queryKey: favoriteKeys.list(user.id),
    queryFn: async ({ signal }) => {
      const ids: string[] = [];
      try {
        for (let page = 1; page <= maxPages; page++) {
          const { favorites, meta } = await apiFetch({
            path: '/patients/favorites/',
            query: { page, limit: pageLimit },
            token: await user.getToken(),
            schema: favoritesResponseSchema,
            expected: isFavoriteSignUpNeeded,
            signal,
          });
          ids.push(...favorites.map((favorite) => favorite.specialistId));
          if (page >= meta.totalPages) break;
        }
      } catch (error) {
        if (isFavoriteSignUpNeeded(error)) return [];
        throw error;
      }
      return ids;
    },
    staleTime: 5 * 60_000,
  });
}

export async function addFavorite(
  user: TokenHolder,
  specialistId: string,
): Promise<void> {
  await apiFetch({
    method: 'POST',
    path: '/patients/favorites/',
    body: { specialistId },
    token: await user.getToken(),
    schema: favoriteResponseSchema,
    expected: isFavoriteSignUpNeeded,
  });
}

export async function removeFavorite(
  user: TokenHolder,
  specialistId: string,
): Promise<void> {
  await apiFetch({
    method: 'DELETE',
    path: '/patients/favorites/:specialistId',
    params: { specialistId },
    token: await user.getToken(),
    schema: removedFavoriteResponseSchema,
  });
}
