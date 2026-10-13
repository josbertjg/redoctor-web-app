import { http, HttpResponse } from 'msw';

import { reviewBodySchema } from '@/app/lib/schemas/reviews';

import {
  appointmentFor,
  appointmentIds,
  type AppointmentPayload,
} from '../../factories/appointments';
import {
  buildCreatedReview,
  buildReviewsResponse,
} from '../../factories/reviews';
import { apiUrl, errorEnvelope } from '../api-url';
import { badRequest, isStranger, unauthorized } from './identity';

/**
 * `GET /reviews/pending` answering the given consultations. The default
 * handler answers none (everything rated); a test that needs the wall
 * installs this with `server.use`.
 */
export function pendingReviewsHandler(appointments: AppointmentPayload[]) {
  return http.get(apiUrl('/reviews/pending'), ({ request }) =>
    isStranger(request) ? unauthorized() : HttpResponse.json({ appointments }),
  );
}

/*
 * Reviews (M7, M8): a specialist's public ones, the patient's pending ones
 * and the rating itself, with the API's rules — one review per finished
 * consultation.
 */
export const reviewsHandlers = [
  http.get(apiUrl('/reviews/specialists/:specialistId'), () =>
    HttpResponse.json(buildReviewsResponse()),
  ),

  pendingReviewsHandler([]),

  http.post(
    apiUrl('/reviews/appointments/:appointmentId'),
    async ({ request, params }) => {
      if (isStranger(request)) return unauthorized();
      const body = reviewBodySchema.safeParse(await request.json());
      if (!body.success) return badRequest();
      const id = String(params.appointmentId);
      const appointment = appointmentFor(id);
      if (!appointment) {
        return HttpResponse.json(
          errorEnvelope('ERR_4003', 'Appointment not found'),
          { status: 404 },
        );
      }
      // The API's own codes for reviews are not documented: the web reads
      // the status and looks at the pending list.
      if (id === appointmentIds.reviewed) {
        return HttpResponse.json(
          errorEnvelope('ERR_4501', 'Appointment already reviewed'),
          { status: 409 },
        );
      }
      if (appointment.status !== 'COMPLETED') {
        return HttpResponse.json(
          errorEnvelope('ERR_4502', 'Appointment not completed'),
          { status: 409 },
        );
      }
      return HttpResponse.json(
        {
          review: buildCreatedReview({
            appointmentId: id,
            rating: body.data.rating,
            comment: body.data.comment ?? null,
          }),
        },
        { status: 201 },
      );
    },
  ),
];
