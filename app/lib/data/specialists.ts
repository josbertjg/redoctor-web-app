import 'server-only';

import { z } from 'zod';

import { apiFetch } from '../api/client';
import { isApiError } from '../api/errors';
import {
  publicProfileResponseSchema,
  toSpecialistProfile,
  type SpecialistProfile,
} from '../schemas/specialists';

/*
 * Server-side readers for the public profile (`/s/{id}`), rendered on the
 * server: no CORS, cached in the Data Cache and shared by every visitor
 * (100 requests/min per IP, AGENTS.md §5).
 */

export const specialistTag = (specialistId: string) =>
  `specialist:${specialistId}`;

/** Public profiles change rarely and nothing pushes changes yet: 5 minutes. */
const PROFILE_REVALIDATE_SECONDS = 300;

const specialistIdSchema = z.uuid();

/** The public profile, or null when it does not exist. */
export async function getSpecialistProfile(
  specialistId: string,
): Promise<SpecialistProfile | null> {
  // A malformed id cannot exist: answer without spending a request.
  if (!specialistIdSchema.safeParse(specialistId).success) return null;

  try {
    const response = await apiFetch({
      path: '/specialists/:specialistId/public-profile',
      params: { specialistId },
      schema: publicProfileResponseSchema,
      next: {
        revalidate: PROFILE_REVALIDATE_SECONDS,
        tags: [specialistTag(specialistId)],
      },
    });
    return toSpecialistProfile(response);
  } catch (error) {
    if (isApiError(error) && error.status === 404) return null;
    throw error;
  }
}
