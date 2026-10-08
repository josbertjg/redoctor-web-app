import type { specialtiesTreeResponseSchema } from '@/app/lib/schemas/specialties';

import type { z } from 'zod';

type TreeInput = z.input<typeof specialtiesTreeResponseSchema>;
type NodeInput = TreeInput['data'][number];

function node(
  id: string,
  name: string,
  parentId: string | null,
  children: NodeInput[] = [],
): NodeInput {
  return {
    id,
    name,
    key: null,
    femenineName: null,
    masculineName: null,
    parentId,
    subspecialties: [],
    children,
  };
}

/* Shaped like the dev catalog: one root, «Medicina», with its specialties. */
export function buildSpecialtiesTreeResponse(): TreeInput {
  return {
    data: [
      node('root', 'Medicina', null, [
        node('s1', 'Medicina General', 'root'),
        node('s2', 'Cardiología', 'root'),
        node('s3', 'Ginecología y Obstetricia', 'root'),
      ]),
    ],
  };
}
