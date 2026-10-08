import 'server-only';

import { specialistTag } from './specialists';
import { apiFetch } from '../api/client';
import {
  specialistReviewsResponseSchema,
  toSpecialistReviews,
  type SpecialistReviews,
} from '../schemas/reviews';

const REVIEWS_REVALIDATE_SECONDS = 300;

/** The latest public reviews of a specialist, with the average and distribution. */
export async function getSpecialistReviews(
  specialistId: string,
  { limit = 5 }: { limit?: number } = {},
): Promise<SpecialistReviews> {
  const response = await apiFetch({
    path: '/reviews/specialists/:specialistId',
    params: { specialistId },
    query: { page: 1, limit },
    schema: specialistReviewsResponseSchema,
    next: {
      revalidate: REVIEWS_REVALIDATE_SECONDS,
      tags: [specialistTag(specialistId), `reviews:${specialistId}`],
    },
  });
  return toSpecialistReviews(response);
}
