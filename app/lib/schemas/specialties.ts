import { z } from 'zod';

/*
 * `GET /specialties/tree` (public): the catalog, as a tree. The landing lists
 * it from the API, never hand-written (landing doc, «Antes de publicar»).
 */

type SpecialtyNodeInput = {
  id: string;
  name: string;
  key: string | null;
  femenineName: string | null;
  masculineName: string | null;
  parentId: string | null;
  subspecialties: { id: string; name: string }[];
  children: SpecialtyNodeInput[];
};

// Both type arguments: with only the output, the input (what the factories
// build) would be `unknown`.
const specialtyNodeSchema: z.ZodType<SpecialtyNodeInput, SpecialtyNodeInput> =
  z.object({
    id: z.string(),
    name: z.string(),
    key: z.string().nullable(),
    femenineName: z.string().nullable(),
    masculineName: z.string().nullable(),
    parentId: z.string().nullable(),
    subspecialties: z.array(z.object({ id: z.string(), name: z.string() })),
    get children() {
      return z.array(specialtyNodeSchema);
    },
  });

export const specialtiesTreeResponseSchema = z.object({
  data: z.array(specialtyNodeSchema),
});

export type SpecialtiesTreeResponse = z.output<
  typeof specialtiesTreeResponseSchema
>;

export type Specialty = {
  id: string;
  name: string;
  children: Specialty[];
};

function toSpecialty(node: SpecialtyNodeInput): Specialty {
  return {
    id: node.id,
    name: node.name,
    children: node.children.map(toSpecialty),
  };
}

export function toSpecialtiesTree(
  response: SpecialtiesTreeResponse,
): Specialty[] {
  return response.data.map(toSpecialty);
}

/** Every specialty of the tree, depth first, as a flat list. */
export function flattenSpecialties(tree: Specialty[]): Specialty[] {
  return tree.flatMap((node) => [node, ...flattenSpecialties(node.children)]);
}
