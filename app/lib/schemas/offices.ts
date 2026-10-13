import { z } from 'zod';

/*
 * The specialist's own offices (`GET /specialists/offices`), as the panel
 * needs them (M14): to filter the agenda and the statistics by office when
 * there is more than one. Created and edited in the app only.
 */

export const officeSchema = z.object({
  id: z.string(),
  name: z.string(),
  isActive: z.boolean().catch(true),
});

export const officesResponseSchema = z.object({
  offices: z.array(officeSchema),
});

export type Office = z.infer<typeof officeSchema>;
