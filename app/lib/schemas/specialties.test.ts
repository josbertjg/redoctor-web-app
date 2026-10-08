import { describe, expect, it } from 'vitest';

import { buildSpecialtiesTreeResponse } from '@/tests/factories/specialties';

import {
  flattenSpecialties,
  specialtiesTreeResponseSchema,
  toSpecialtiesTree,
} from './specialties';

describe('specialties tree', () => {
  it('keeps the shape of the catalog and lists it depth first', () => {
    const tree = toSpecialtiesTree(
      specialtiesTreeResponseSchema.parse(buildSpecialtiesTreeResponse()),
    );

    expect(tree).toHaveLength(1);
    expect(tree[0]?.children).toHaveLength(3);
    expect(flattenSpecialties(tree).map((specialty) => specialty.name)).toEqual(
      [
        'Medicina',
        'Medicina General',
        'Cardiología',
        'Ginecología y Obstetricia',
      ],
    );
  });

  it('rejects a node that breaks the contract at any depth', () => {
    const response = buildSpecialtiesTreeResponse();
    const broken = {
      data: [
        { ...response.data[0], children: [{ id: 'x', name: 'Sin campos' }] },
      ],
    };

    expect(specialtiesTreeResponseSchema.safeParse(broken).success).toBe(false);
  });
});
