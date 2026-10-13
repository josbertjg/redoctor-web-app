import { z } from 'zod';

/*
 * A consultation's price as the API writes it wherever one appears (an
 * appointment, an office's rates): a type and its amounts, in the
 * currency's units. `formatPrice` (app/lib/format/money.ts) puts it in
 * words.
 */

export const priceTypes = ['FIXED', 'RANGE', 'FROM'] as const;

export const priceSchema = z.object({
  // A type this version does not know reads as no price, not as a broken answer.
  type: z.enum(priceTypes).nullish().catch(null),
  currency: z.string().nullish(),
  amount: z.number().nullish(),
  minAmount: z.number().nullish(),
  maxAmount: z.number().nullish(),
});

export type Price = z.output<typeof priceSchema>;
