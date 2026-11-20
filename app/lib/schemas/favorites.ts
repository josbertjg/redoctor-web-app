import { z } from 'zod';

/*
 * The patient's favourite specialists (`/patients/favorites`, the API's,
 * a patient's session; the app's «Favoritos»): the public profile's heart
 * keeps one (Figma, 2026-11-16). The list comes in pages of 100 at most;
 * the web only needs to know whether a profile is among them. Adding one
 * answers what was saved, removing one whether it was there
 * (`removed: false`: removing is idempotent).
 */
export const favoritesResponseSchema = z.object({
  favorites: z.array(z.object({ specialistId: z.string() })),
  meta: z.object({ page: z.number(), totalPages: z.number() }),
});

export const favoriteResponseSchema = z.object({
  favorite: z.object({ specialistId: z.string() }),
});

export const removedFavoriteResponseSchema = z.object({
  removed: z.boolean(),
});
