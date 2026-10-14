import { queryOptions } from '@tanstack/react-query';

import { apiFetch } from '../api/client';
import { isApiError, type ApiError } from '../api/errors';
import { createWriteOnceGuard } from '../api/write-once';
import { addDays } from '../reports/period';
import {
  appointmentListResponseSchema,
  appointmentResponseSchema,
  type AppointmentResponse,
} from '../schemas/appointments';
import {
  isThisBooking,
  officeServicesSchema,
  tercerosResponseSchema,
  toBookingBody,
  toBookingReasons,
  toTerceros,
  type BookingRequest,
} from '../schemas/booking';

import type { TokenHolder } from '../api/types';

/*
 * Booking from a specialist's profile, in the browser with the patient's
 * token (AGENTS.md §4): an office's reasons and prices, the people in the
 * patient's care, and the booking itself through the write-once guard
 * (§5). The office's free days and slots are the reschedule's
 * (appointments.ts).
 */

export const bookingKeys = {
  services: (officeId: string) => ['office', officeId, 'services'] as const,
  terceros: (userId: string) => ['terceros', userId] as const,
};

const notFound = (error: ApiError) => error.status === 404;

/**
 * A specialist who is not active — no plan, out of the search — keeps a
 * public profile, but every booking read and the booking itself answer 404:
 * the flow says so in place, as the app does, and nothing is reported.
 */
export function isInactiveSpecialist(error: unknown): boolean {
  return isApiError(error) && notFound(error);
}

/** The reasons enabled at an office, each with its price. */
export function officeServicesQueryOptions(
  user: TokenHolder,
  officeId: string,
) {
  return queryOptions({
    queryKey: bookingKeys.services(officeId),
    queryFn: async ({ signal }) =>
      toBookingReasons(
        await apiFetch({
          path: '/scheduling/offices/:officeId/services',
          params: { officeId },
          token: await user.getToken(),
          schema: officeServicesSchema,
          expected: notFound,
          signal,
        }),
      ),
    // The specialist changes them in the app, now and then: minutes.
    staleTime: 5 * 60_000,
  });
}

/** Everyone the patient has booked for, to choose from again. */
export function tercerosQueryOptions(user: TokenHolder) {
  return queryOptions({
    queryKey: bookingKeys.terceros(user.id),
    queryFn: async ({ signal }) =>
      toTerceros(
        await apiFetch({
          path: '/scheduling/terceros',
          token: await user.getToken(),
          schema: tercerosResponseSchema,
          signal,
        }),
      ),
    staleTime: 5 * 60_000,
  });
}

const bookings = createWriteOnceGuard<AppointmentResponse>();

/** Who it is for, in the booking's intent: a new person is one intent, whatever the name. */
function attendeeKey({ attendee }: BookingRequest): string {
  if (attendee.kind === 'tercero') return attendee.tercero.id;
  return attendee.kind;
}

/**
 * Books the appointment. A lost answer looks for it among the patient's
 * appointments of that day before calling it failed, and again before
 * sending it a second time — the same specialist, office, day and hour,
 * not cancelled, as the app looks —; so does a slot refused as taken,
 * which a second tab may have taken with this very booking. What the API
 * refuses is the flow's to explain: a slot just taken (409 ERR_4002), a
 * sign-up to finish (403 ERR_2010), a specialist who is not active (404).
 */
export function bookAppointment(
  user: TokenHolder,
  request: BookingRequest,
): Promise<AppointmentResponse> {
  const lookAgain = async () => {
    const { appointments } = await apiFetch({
      path: '/scheduling/appointments',
      // A day after: whether the API counts `to` in or out, the day is covered.
      query: { from: request.date, to: addDays(request.date, 1) },
      token: await user.getToken(),
      schema: appointmentListResponseSchema,
    });
    return (
      appointments.find((appointment) => isThisBooking(appointment, request)) ??
      null
    );
  };

  return bookings({
    intent: [
      'book',
      request.specialistId,
      request.officeId,
      `${request.date}T${request.startTime}`,
      attendeeKey(request),
    ].join(':'),
    send: async () => {
      try {
        const { appointment } = await apiFetch({
          method: 'POST',
          path: '/scheduling/appointments',
          token: await user.getToken(),
          body: toBookingBody(request),
          schema: appointmentResponseSchema,
          expected: (error) =>
            error.status === 403 ||
            error.status === 404 ||
            error.status === 409,
        });
        return appointment;
      } catch (error) {
        if (isApiError(error) && error.status === 409) {
          const landed = await lookAgain();
          if (landed) return landed;
        }
        throw error;
      }
    },
    findLanded: lookAgain,
  });
}
