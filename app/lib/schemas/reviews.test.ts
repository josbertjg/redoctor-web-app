import { describe, expect, it } from 'vitest';

import { buildReview, buildReviewsResponse } from '@/tests/factories/reviews';

import {
  shortPatientName,
  specialistReviewsResponseSchema,
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
