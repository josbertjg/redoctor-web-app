import { QueryClient } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import {
  appointmentIds,
  buildAppointment,
  buildPendingReviews,
  hoursFromNow,
} from '@/tests/factories/appointments';

import {
  pendingReviewsQueryOptions,
  sortPendingReviews,
  submitReview,
} from './reviews';
import { apiUrl } from '../../../tests/msw/api-url';
import { validToken } from '../../../tests/msw/handlers/identity';
import { pendingReviewsHandler } from '../../../tests/msw/handlers/reviews';
import { server } from '../../../tests/msw/server';
import { appointmentListResponseSchema } from '../schemas/appointments';

const user = { id: 'uid-1', getToken: () => Promise.resolve(validToken) };

const finished = (id: string, hoursAgo: number) =>
  buildAppointment({ id, status: 'COMPLETED' }, hoursFromNow(-hoursAgo));

describe('pendingReviewsQueryOptions', () => {
  it('reads the finished consultations still to rate', async () => {
    server.use(pendingReviewsHandler(buildPendingReviews()));

    const pending = await new QueryClient().query(
      pendingReviewsQueryOptions(user),
    );

    expect(pending.map((appointment) => appointment.id)).toEqual([
      appointmentIds.completed,
      appointmentIds.completedDependent,
    ]);
  });

  it('answers none when everything is rated', async () => {
    await expect(
      new QueryClient().query(pendingReviewsQueryOptions(user)),
    ).resolves.toEqual([]);
  });
});

describe('sortPendingReviews', () => {
  it('puts the oldest consultation first, as the app does', () => {
    const { appointments } = appointmentListResponseSchema.parse({
      appointments: buildPendingReviews(),
    });

    expect(
      sortPendingReviews(appointments).map((appointment) => appointment.id),
    ).toEqual([appointmentIds.completedDependent, appointmentIds.completed]);
  });
});

describe('submitReview', () => {
  it('sends the stars and the comment, and gets the review back', async () => {
    const { review } = await submitReview(user, appointmentIds.completed, {
      rating: 5,
      comment: 'Muy puntual.',
    });

    expect(review).toMatchObject({
      appointmentId: appointmentIds.completed,
      rating: 5,
      comment: 'Muy puntual.',
    });
  });

  it('counts a refusal as done once the consultation is no longer pending', async () => {
    await expect(
      submitReview(user, appointmentIds.reviewed, { rating: 4 }),
    ).resolves.toEqual({
      appointmentId: appointmentIds.reviewed,
      review: null,
    });
  });

  it('reports a refusal while the consultation still waits for its review', async () => {
    server.use(pendingReviewsHandler([finished(appointmentIds.reviewed, 480)]));

    await expect(
      submitReview(user, appointmentIds.reviewed, { rating: 4 }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('looks for the review when the answer is lost, and never sends it twice', async () => {
    let posts = 0;
    let reads = 0;
    server.use(
      http.post(apiUrl('/reviews/appointments/:appointmentId'), () => {
        posts += 1;
        return HttpResponse.error();
      }),
      http.get(apiUrl('/reviews/pending'), () => {
        reads += 1;
        return HttpResponse.json({
          appointments:
            reads === 1 ? [finished(appointmentIds.completed, 72)] : [],
        });
      }),
    );

    // The answer is lost while the consultation still waits: the doubt stays.
    await expect(
      submitReview(user, appointmentIds.completed, { rating: 5 }),
    ).rejects.toMatchObject({ kind: 'uncertain' });
    expect(posts).toBe(1);

    // Next try: it is no longer pending, so it landed; nothing is re-sent.
    await expect(
      submitReview(user, appointmentIds.completed, { rating: 5 }),
    ).resolves.toEqual({
      appointmentId: appointmentIds.completed,
      review: null,
    });
    expect(posts).toBe(1);
  });
});
