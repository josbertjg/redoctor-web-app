import { queryOptions } from '@tanstack/react-query';

import { apiFetch } from '../api/client';
import { isApiError } from '../api/errors';
import { createWriteOnceGuard } from '../api/write-once';
import {
  appointmentListResponseSchema,
  appointmentResponseSchema,
  type AppointmentResponse,
} from '../schemas/appointments';
import { availableDaysSchema, daySlotsSchema } from '../schemas/availability';

import type { TokenHolder } from '../api/types';

/*
 * The patient's appointments, read and changed in the browser with their
 * token (AGENTS.md §4): the list behind `/appointments` (M6), the page
 * behind `/a/{id}` and its actions (M5) — confirm (from 24 h before), cancel
 * and reschedule to another slot of the same office. Every write goes
 * through the write-once guard (§5).
 */

export const appointmentKeys = {
  list: (userId: string) => ['appointments', userId] as const,
  detail: (userId: string, appointmentId: string) =>
    ['appointment', userId, appointmentId] as const,
  availableDays: (officeId: string, month: string) =>
    ['office', officeId, 'available-days', month] as const,
  slots: (officeId: string, date: string) =>
    ['office', officeId, 'slots', date] as const,
};

/**
 * The appointment, or why it cannot be shown: another account's (403), or
 * none at all (404, or a malformed id). Neither is an error to report: a
 * link opened with the wrong account, a mistyped link.
 */
export type AppointmentRead =
  | { kind: 'found'; appointment: AppointmentResponse }
  | { kind: 'not-yours' }
  | { kind: 'not-found' };

async function readAppointment(
  user: TokenHolder,
  appointmentId: string,
  signal?: AbortSignal,
): Promise<AppointmentRead> {
  try {
    const { appointment } = await apiFetch({
      path: '/scheduling/appointments/:appointmentId',
      params: { appointmentId },
      token: await user.getToken(),
      schema: appointmentResponseSchema,
      expected: (error) =>
        error.status === 400 || error.status === 403 || error.status === 404,
      ...(signal ? { signal } : {}),
    });
    return { kind: 'found', appointment };
  } catch (error) {
    if (isApiError(error) && error.status === 403) return { kind: 'not-yours' };
    if (isApiError(error) && (error.status === 404 || error.status === 400)) {
      return { kind: 'not-found' };
    }
    throw error;
  }
}

/** Every appointment where the person is the patient, as the API lists them. */
export function appointmentsQueryOptions(user: TokenHolder) {
  return queryOptions({
    queryKey: appointmentKeys.list(user.id),
    queryFn: async ({ signal }) => {
      const { appointments } = await apiFetch({
        path: '/scheduling/appointments',
        token: await user.getToken(),
        schema: appointmentListResponseSchema,
        signal,
      });
      return appointments;
    },
    staleTime: 30_000,
  });
}

export function appointmentQueryOptions(
  user: TokenHolder,
  appointmentId: string,
) {
  return queryOptions({
    queryKey: appointmentKeys.detail(user.id, appointmentId),
    queryFn: ({ signal }) => readAppointment(user, appointmentId, signal),
    // The specialist may move or cancel it meanwhile: short, no polling.
    staleTime: 30_000,
  });
}

const writes = createWriteOnceGuard<AppointmentResponse>();

type Change = {
  action: 'confirm' | 'cancel' | 'reschedule';
  /** Tells a write that landed from one that did not. */
  landed: (appointment: AppointmentResponse) => boolean;
  body?: unknown;
  /** One doubt per intended result: a reschedule to another slot is another write. */
  intent: string;
};

function change(
  user: TokenHolder,
  appointmentId: string,
  { action, landed, body, intent }: Change,
): Promise<AppointmentResponse> {
  const lookAgain = async () => {
    const current = await readAppointment(user, appointmentId);
    return current.kind === 'found' && landed(current.appointment)
      ? current.appointment
      : null;
  };
  return writes({
    intent: `${intent}:${appointmentId}`,
    send: async () => {
      try {
        const { appointment } = await apiFetch({
          method: 'POST',
          path: `/scheduling/appointments/:appointmentId/${action}`,
          params: { appointmentId },
          token: await user.getToken(),
          ...(body === undefined ? {} : { body }),
          schema: appointmentResponseSchema,
          // Refused because it is already so, or explained in place (the
          // confirmation window, an hour just taken).
          expected: (error) => error.status === 409,
        });
        return appointment;
      } catch (error) {
        // Refused because it is already so (a second tab, a lost answer).
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

export function confirmAppointment(user: TokenHolder, appointmentId: string) {
  return change(user, appointmentId, {
    action: 'confirm',
    intent: 'confirm',
    landed: (appointment) => appointment.status === 'CONFIRMED',
  });
}

/** The patient cancels without a reason, as in the app. */
export function cancelAppointment(user: TokenHolder, appointmentId: string) {
  return change(user, appointmentId, {
    action: 'cancel',
    intent: 'cancel',
    body: {},
    landed: (appointment) => appointment.status === 'CANCELLED',
  });
}

export function rescheduleAppointment(
  user: TokenHolder,
  appointmentId: string,
  slot: { date: string; startTime: string },
) {
  return change(user, appointmentId, {
    action: 'reschedule',
    intent: `reschedule:${slot.date}T${slot.startTime}`,
    body: slot,
    landed: (appointment) =>
      appointment.slot.date === slot.date &&
      appointment.slot.startTime.slice(0, 5) === slot.startTime,
  });
}

/** The days of a month (YYYY-MM) with free slots at an office. */
export function availableDaysQueryOptions(
  user: TokenHolder,
  officeId: string,
  month: string,
) {
  return queryOptions({
    queryKey: appointmentKeys.availableDays(officeId, month),
    queryFn: async ({ signal }) =>
      apiFetch({
        path: '/scheduling/offices/:officeId/available-days',
        params: { officeId },
        query: { month },
        token: await user.getToken(),
        schema: availableDaysSchema,
        signal,
      }),
    staleTime: 60_000,
  });
}

/** One day's slots at an office (YYYY-MM-DD). */
export function daySlotsQueryOptions(
  user: TokenHolder,
  officeId: string,
  date: string,
) {
  return queryOptions({
    queryKey: appointmentKeys.slots(officeId, date),
    queryFn: async ({ signal }) =>
      apiFetch({
        path: '/scheduling/offices/:officeId/slots',
        params: { officeId },
        query: { date },
        token: await user.getToken(),
        schema: daySlotsSchema,
        signal,
      }),
    // Someone else may take a slot: a day is read again when it is chosen.
    staleTime: 15_000,
  });
}
