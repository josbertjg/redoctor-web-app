import { z } from 'zod';

/** The API's error envelope: `{ code: 'ERR_xxxx', message, details? }`. */
export const apiErrorEnvelopeSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export type ApiErrorEnvelope = z.infer<typeof apiErrorEnvelopeSchema>;
