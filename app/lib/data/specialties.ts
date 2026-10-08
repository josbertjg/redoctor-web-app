import 'server-only';

import { apiFetch } from '../api/client';
import {
  specialtiesTreeResponseSchema,
  toSpecialtiesTree,
  type Specialty,
} from '../schemas/specialties';

export const specialtiesTag = 'specialties';

/** The catalog changes when the team adds a specialty: once a day is enough. */
const SPECIALTIES_REVALIDATE_SECONDS = 86_400;

export async function getSpecialtiesTree(): Promise<Specialty[]> {
  const response = await apiFetch({
    path: '/specialties/tree',
    schema: specialtiesTreeResponseSchema,
    next: {
      revalidate: SPECIALTIES_REVALIDATE_SECONDS,
      tags: [specialtiesTag],
    },
  });
  return toSpecialtiesTree(response);
}
