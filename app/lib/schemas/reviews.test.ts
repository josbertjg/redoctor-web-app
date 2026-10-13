import { describe, expect, it } from 'vitest';

import {
  buildCreatedReview,
  buildReview,
  buildReviewsResponse,
} from '@/tests/factories/reviews';

import {
  createdReviewResponseSchema,
  reviewBodySchema,
  shortPatientName,
  specialistReviewsResponseSchema,
  toReviewBody,
  toSpecialistReviews,
} from './reviews';

describe('shortPatientName', () => {
  it('publishes the first name and the initial of the surname', () => {
    expect(
      shortPatientName({ firstName: 'María José', lastName: 'rodríguez' }),
    ).toBe('María José R.');
    expect(shortPatientName({ firstName: ' Luis ', lastName: ' ' })).toBe(
      'Luis',
    );
  });

  it('guesses from the full name when the parts are missing', () => {
    expect(shortPatientName({ fullName: 'Pedro Pablo Pérez' })).toBe(
      'Pedro P.',
    );
    expect(shortPatientName({ firstName: null, fullName: 'Ana' })).toBe('Ana');
  });

  it('has no name to publish when there is none', () => {
    expect(shortPatientName({ fullName: '   ' })).toBeNull();
    expect(shortPatientName({})).toBeNull();
  });
});

describe('toSpecialistReviews', () => {
  it('never carries a full name, and none at all when anonymous', () => {
    const reviews = toSpecialistReviews(
      specialistReviewsResponseSchema.parse(
        buildReviewsResponse([
          buildReview(),
          buildReview({ id: 'r2', isAnonymous: true, comment: '   ' }),
        ]),
      ),
    );

    expect(reviews.reviews.map((review) => review.author)).toEqual([
      'María José R.',
      null,
    ]);
    expect(reviews.reviews[1]?.comment).toBeNull();
    expect(reviews.total).toBe(2);
    expect(reviews.distribution[5]).toEqual({ count: 2, percent: 100 });
  });
});

describe('toReviewBody', () => {
  it('sends the stars and a trimmed comment, or no comment at all', () => {
    expect(toReviewBody({ rating: 5, comment: '  Muy puntual.  ' })).toEqual({
      rating: 5,
      comment: 'Muy puntual.',
    });
    expect(toReviewBody({ rating: 4, comment: '   ' })).toEqual({ rating: 4 });
    expect(toReviewBody({ rating: 3 })).toEqual({ rating: 3 });
  });

  it('refuses what the API would refuse', () => {
    expect(() => toReviewBody({ rating: 0 })).toThrow();
    expect(() => toReviewBody({ rating: 6 })).toThrow();
    expect(() => toReviewBody({ rating: 4.5 })).toThrow();
    expect(() =>
      toReviewBody({ rating: 5, comment: 'a'.repeat(1001) }),
    ).toThrow();
    expect(
      reviewBodySchema.safeParse({ rating: 5, anonymous: true }).success,
    ).toBe(false);
  });
});

describe('createdReviewResponseSchema', () => {
  it('reads the review the API created', () => {
    const { review } = createdReviewResponseSchema.parse({
      review: buildCreatedReview({ rating: 4, comment: 'Bien.' }),
    });
    expect(review.rating).toBe(4);
    expect(review.comment).toBe('Bien.');
  });
});
