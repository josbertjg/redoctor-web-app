import { z } from 'zod';

import type { SupportContact, SupportLine } from '../support';

/*
 * `GET /config/support` (REDOC-357, public, never a 404): the support lines
 * an admin keeps, ten per list at most, in the admin's order. Empty lists
 * are a valid answer. A line this version cannot use is left out instead
 * of breaking the list.
 */

const supportLineSchema = z.object({
  label: z.string(),
  phone: z.string(),
});

const lines = z.array(z.unknown()).catch([]);

export const supportContactResponseSchema = z.object({
  supportCallPhones: lines,
  supportWhatsappPhones: lines,
});

export type SupportContactResponse = z.infer<
  typeof supportContactResponseSchema
>;

/** An international number with at least a country code and a line. */
const usablePhone = /^\+\d[\d -]*\d$/;

function toLines(entries: readonly unknown[]): SupportLine[] {
  return entries.flatMap((entry) => {
    const parsed = supportLineSchema.safeParse(entry);
    if (!parsed.success) return [];
    const phone = parsed.data.phone.trim();
    if (!usablePhone.test(phone)) return [];
    return [{ label: parsed.data.label.trim(), phone }];
  });
}

export function toSupportContact(
  response: SupportContactResponse,
): SupportContact {
  return {
    whatsapp: toLines(response.supportWhatsappPhones),
    calls: toLines(response.supportCallPhones),
  };
}
