import { http, HttpResponse } from 'msw';

import { knownSpecialistId } from '@/tests/factories/specialists';

import { apiUrl } from '../api-url';
import { isStranger, unauthorized } from './identity';

/** A specialist the test patient keeps among their favourites already. */
export const favoriteSpecialistId = 'f4f4f4f4-0000-4000-8000-000000000001';

/*
 * The patient's favourites (`/patients/favorites`, a patient's session):
 * one specialist kept already — not the test profile —, adding answers
 * what was saved and removing whether it was there.
 */
export const favoritesHandlers = [
  http.get(apiUrl('/patients/favorites/'), ({ request }) => {
    if (isStranger(request)) return unauthorized();
    return HttpResponse.json({
      favorites: [
        {
          specialistId: favoriteSpecialistId,
          favoritedAt: '2026-11-10T14:00:00.000Z',
          displayName: 'Laura Méndez',
          photoUrl: null,
          isVerified: true,
          specialties: [],
          rating: null,
          reviewCount: 0,
          offices: [],
          officeCount: 0,
        },
      ],
      meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
    });
  }),
  http.post(apiUrl('/patients/favorites/'), async ({ request }) => {
    if (isStranger(request)) return unauthorized();
    const { specialistId } = (await request.json()) as { specialistId: string };
    return HttpResponse.json(
      {
        favorite: {
          specialistId: specialistId || knownSpecialistId,
          favoritedAt: new Date().toISOString(),
        },
      },
      { status: 201 },
    );
  }),
  http.delete(apiUrl('/patients/favorites/:specialistId'), ({ request }) => {
    if (isStranger(request)) return unauthorized();
    return HttpResponse.json({ removed: true });
  }),
];
