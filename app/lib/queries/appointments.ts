import { queryOptions } from '@tanstack/react-query';

import { apiFetch } from '../api/client';
import { isApiError } from '../api/errors';
import { createWriteOnceGuard } from '../api/write-once';
import {
  appointmentResponseSchema,
  type AppointmentResponse,
} from '../schemas/appointments';
import { availableDaysSchema, daySlotsSchema } from '../schemas/availability';

/*
 * One appointment, read and changed in the browser with the patient's token
 * (M5, AGENTS.md §4): the page behind `/a/{id}` and its actions — confirm
 * (from 24 h before), cancel and reschedule to another slot of the same
 * office. Every write goes through the write-once guard (§5).
 */

type TokenHolder = {
  /** Firebase's uid: the cache is per person. */
  id: string;
  getToken: () => Promise<string>;
};

export const appointmentKeys = {
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
