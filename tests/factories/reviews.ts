import {
  specialistReviewsResponseSchema,
  toSpecialistReviews,
  type SpecialistReviews,
} from '@/app/lib/schemas/reviews';

import type { z } from 'zod';

type ReviewsInput = z.input<typeof specialistReviewsResponseSchema>;
type ReviewInput = ReviewsInput['reviews'][number];

export function buildReview(overrides: Partial<ReviewInput> = {}): ReviewInput {
  return {
    id: 'r1',
    patientName: 'María José Rodríguez',
    patientFirstName: 'María José',
    patientLastName: 'Rodríguez',
    isAnonymous: false,
    rating: 5,
    comment: 'Muy puntual y explica todo con calma.',
    createdAt: '2026-09-20T15:30:00.000Z',
    ...overrides,
  };
}

export function buildReviewsResponse(
  reviews: ReviewInput[] = [
    buildReview(),
    buildReview({
      id: 'r2',
      patientName: 'Luis Gómez',
      patientFirstName: 'Luis',
      patientLastName: 'Gómez',
      rating: 4,
      comment: null,
      createdAt: '2026-09-02T13:00:00.000Z',
    }),
  ],
): ReviewsInput {
  const count = reviews.length;
  const average =
    count === 0
      ? null
      : reviews.reduce((sum, review) => sum + review.rating, 0) / count;
  const share = (stars: number) => {
    const matching = reviews.filter((review) => review.rating === stars).length;
    return {
      count: matching,
      percent: count === 0 ? 0 : (matching / count) * 100,
    };
  };

  return {
    reviews,
    meta: { total: count, page: 1, limit: 5, totalPages: count ? 1 : 0 },
    rating: { average, count },
    distribution: {
      1: share(1),
      2: share(2),
      3: share(3),
      4: share(4),
      5: share(5),
    },
  };
}

/** The DTO the UI receives, built through the real contract. */
export function buildSpecialistReviews(
  response: ReviewsInput = buildReviewsResponse(),
): SpecialistReviews {
  return toSpecialistReviews(specialistReviewsResponseSchema.parse(response));
}
