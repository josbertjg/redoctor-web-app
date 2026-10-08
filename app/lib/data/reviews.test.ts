// @vitest-environment node
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { buildReviewsResponse } from '@/tests/factories/reviews';
import { knownSpecialistId } from '@/tests/factories/specialists';
import { apiUrl } from '@/tests/msw/api-url';
import { server } from '@/tests/msw/server';

import { getSpecialistReviews } from './reviews';

describe('getSpecialistReviews', () => {
  it('asks for the first page with the requested size', async () => {
    let query: URLSearchParams | undefined;
    server.use(
      http.get(apiUrl('/reviews/specialists/:specialistId'), ({ request }) => {
        query = new URL(request.url).searchParams;
        return HttpResponse.json(buildReviewsResponse());
      }),
    );

    const reviews = await getSpecialistReviews(knownSpecialistId, { limit: 3 });

    expect(query?.get('page')).toBe('1');
    expect(query?.get('limit')).toBe('3');
    expect(reviews.reviews.map((review) => review.author)).toEqual([
      'María José R.',
      'Luis G.',
    ]);
  });
});
