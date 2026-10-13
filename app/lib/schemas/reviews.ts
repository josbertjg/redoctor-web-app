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

/* ---------- The patient's own review (M7) --------------------------------- */

/** The API's bounds: one to five stars, a comment of up to 1000 characters. */
export const reviewRatingMin = 1;
export const reviewRatingMax = 5;
export const reviewCommentMaxLength = 1000;

/**
 * `POST /reviews/appointments/{appointmentId}`: strict, as the API refuses
 * what it does not expect; a blank comment is not sent, as the app does.
 */
export const reviewBodySchema = z.strictObject({
  rating: z.number().int().min(reviewRatingMin).max(reviewRatingMax),
  comment: z.string().trim().min(1).max(reviewCommentMaxLength).optional(),
});

export type ReviewBody = z.infer<typeof reviewBodySchema>;

/** The body from what the form holds: the comment trimmed, dropped when blank. */
export function toReviewBody(input: {
  rating: number;
  comment?: string | null | undefined;
}): ReviewBody {
  const comment = input.comment?.trim();
  return reviewBodySchema.parse({
    rating: input.rating,
    ...(comment ? { comment } : {}),
  });
}

/** What the API answers with the review it created (201). */
export const createdReviewResponseSchema = z.object({
  review: z.object({
    id: z.string(),
    appointmentId: z.string(),
    specialistId: z.string().nullish(),
    rating: z.number().int(),
    comment: z.string().nullish(),
    /** Published without a name under a sensitive specialty (REDOC-251). */
    isAnonymous: z.boolean().nullish(),
    createdAt: z.string().nullish(),
  }),
});

export type CreatedReview = z.infer<
  typeof createdReviewResponseSchema
>['review'];

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
