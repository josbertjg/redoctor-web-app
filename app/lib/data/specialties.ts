import 'server-only';

import { apiFetch } from '../api/client';
import {
  flattenSpecialties,
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

/**
 * The catalog, flat, for the search box (M16): what it matches and offers.
 * A page with a search box stands without it — the box then offers no
 * specialties, and the search still runs on the text —, so a failed read
 * answers nothing (apiFetch reported it already).
 */
export async function getSearchCatalog(): Promise<
  { id: string; name: string }[]
> {
  try {
    return flattenSpecialties(await getSpecialtiesTree()).map(
      ({ id, name }) => ({ id, name }),
    );
  } catch {
    return [];
  }
}
