// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { getSpecialtiesTree } from './specialties';

describe('getSpecialtiesTree', () => {
  it('reads the catalog as a tree', async () => {
    const tree = await getSpecialtiesTree();

    expect(tree.map((node) => node.name)).toEqual(['Medicina']);
    expect(tree[0]?.children.map((node) => node.name)).toContain('Cardiología');
  });
});
