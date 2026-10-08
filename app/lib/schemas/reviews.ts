import { z } from 'zod';

/*
 * `GET /reviews/specialists/{specialistId}` (public, paginated, with the
 * average and the distribution). The DTO never carries a full name: see
 * `shortPatientName`.
 */

const countSchema = z.object({ count: z.number().int(), percent: z.number() });

export const specialistReviewsResponseSchema = z.object({
  reviews: z.array(
    z.object({
      id: z.string(),
      patientName: z.string().nullable(),
      patientFirstName: z.string().nullable(),
      patientLastName: z.string().nullable(),
      isAnonymous: z.boolean(),
      rating: z.number().int(),
      comment: z.string().nullable(),
      createdAt: z.string(),
    }),
  ),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
  }),
  rating: z.object({
    average: z.number().nullable(),
    count: z.number().int(),
  }),
  distribution: z.object({
    1: countSchema,
    2: countSchema,
    3: countSchema,
    4: countSchema,
    5: countSchema,
  }),
});

export type SpecialistReviewsResponse = z.output<
  typeof specialistReviewsResponseSchema
>;

export type Review = {
  id: string;
  /** "María P.", or null when anonymous or unknown (the UI says "Paciente"). */
  author: string | null;
  rating: number;
  comment: string | null;
  createdAt: string;
};

export type SpecialistReviews = {
  reviews: Review[];
  total: number;
  rating: { average: number | null; count: number };
  /** Share of reviews per star, 1 to 5. */
  distribution: Record<1 | 2 | 3 | 4 | 5, { count: number; percent: number }>;
};

const trimmed = (value: string | null | undefined) => {
  const result = value?.trim() ?? '';
  return result === '' ? null : result;
};

const initialOf = (value: string) => `${value.slice(0, 1).toUpperCase()}.`;

/**
 * The name to publish: the first name whole and the initial of the surname,
 * "María P." A medical review tells which specialist the patient saw, so a
 * full name under a psychiatrist's or a gynecologist's profile is health
 * information made public. Mirror of the app's `Review.shortPatientName`.
 */
export function shortPatientName(names: {
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
}): string | null {
  const firstName = trimmed(names.firstName);
  if (firstName) {
    const lastName = trimmed(names.lastName);
    return lastName ? `${firstName} ${initialOf(lastName)}` : firstName;
  }

  // Without separate fields, guess: first word whole, initial of the second.
  const parts = trimmed(names.fullName)?.split(/\s+/) ?? [];
  const [first, second] = parts;
  if (!first) return null;
  return second ? `${first} ${initialOf(second)}` : first;
}

export function toSpecialistReviews(
  response: SpecialistReviewsResponse,
): SpecialistReviews {
  return {
    reviews: response.reviews.map((review) => ({
      id: review.id,
      author: review.isAnonymous
        ? null
        : shortPatientName({
            firstName: review.patientFirstName,
            lastName: review.patientLastName,
            fullName: review.patientName,
          }),
      rating: review.rating,
      comment: trimmed(review.comment),
      createdAt: review.createdAt,
    })),
    total: response.meta.total,
    rating: response.rating,
    distribution: response.distribution,
  };
}
