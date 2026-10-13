import { queryOptions } from '@tanstack/react-query';

import { apiFetch } from '../api/client';
import { isApiError } from '../api/errors';
import { createWriteOnceGuard } from '../api/write-once';
import {
  appointmentListResponseSchema,
  type AppointmentResponse,
} from '../schemas/appointments';
import {
  createdReviewResponseSchema,
  type CreatedReview,
  type ReviewBody,
} from '../schemas/reviews';

import type { TokenHolder } from '../api/types';

/*
 * The patient's reviews (M7, AGENTS.md §1): the finished consultations still
 * to rate — which hold `/appointments` until they are rated — and the rating
 * itself. Read and written in the browser with the patient's token (§4); the
 * write goes through the write-once guard (§5).
 */

export const reviewKeys = {
  pending: (userId: string) => ['reviews', 'pending', userId] as const,
};

async function readPending(
  user: TokenHolder,
  signal?: AbortSignal,
): Promise<AppointmentResponse[]> {
  const { appointments } = await apiFetch({
    path: '/reviews/pending',
    token: await user.getToken(),
    schema: appointmentListResponseSchema,
    ...(signal ? { signal } : {}),
  });
  return appointments;
}

/** The finished consultations the person has not rated yet. */
export function pendingReviewsQueryOptions(user: TokenHolder) {
  return queryOptions({
    queryKey: reviewKeys.pending(user.id),
    queryFn: ({ signal }) => readPending(user, signal),
    staleTime: 30_000,
  });
}

/** An instant as a number to compare; something that is not one sorts first. */
const instant = (iso: string | null | undefined) => {
  const time = iso ? new Date(iso).getTime() : NaN;
  return Number.isNaN(time) ? 0 : time;
};

/** The oldest consultation first, by when it ended, as the app orders the wall. */
export function sortPendingReviews(
  appointments: readonly AppointmentResponse[],
): AppointmentResponse[] {
  return [...appointments].sort(
    (a, b) =>
      instant(a.slot.endsAtUtc ?? a.slot.startsAtUtc) -
      instant(b.slot.endsAtUtc ?? b.slot.startsAtUtc),
  );
}

/**
 * What a review left behind: the review the API answered, or none when it
 * could only be inferred — the consultation left the pending list, so the
 * review landed although its answer did not arrive.
 */
export type ReviewSubmission = {
  appointmentId: string;
  review: CreatedReview | null;
};

const writes = createWriteOnceGuard<ReviewSubmission>();

/** `POST /reviews/appointments/{id}`: one to five stars and an optional comment. */
export function submitReview(
  user: TokenHolder,
  appointmentId: string,
  body: ReviewBody,
): Promise<ReviewSubmission> {
  // A rated consultation leaves the pending list: that is how a lost answer,
  // or a refusal because it is already rated, is told from a failure.
  const lookAgain = async (): Promise<ReviewSubmission | null> => {
    const pending = await readPending(user);
    return pending.some((appointment) => appointment.id === appointmentId)
      ? null
      : { appointmentId, review: null };
  };

  return writes({
    intent: `review:${appointmentId}`,
    send: async () => {
      try {
        const { review } = await apiFetch({
          method: 'POST',
          path: '/reviews/appointments/:appointmentId',
          params: { appointmentId },
          body,
          token: await user.getToken(),
          schema: createdReviewResponseSchema,
          // Already rated, or no longer to rate: the pending list says which.
          expected: (error) => error.status === 404 || error.status === 409,
        });
        return { appointmentId, review };
      } catch (error) {
        if (isApiError(error) && error.status === 409) {
          const done = await lookAgain();
          if (done) return done;
        }
        throw error;
      }
    },
    findLanded: lookAgain,
  });
}
