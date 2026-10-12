import type { appointmentSchema } from '@/app/lib/schemas/appointments';

import { knownUserId } from './identity';

import type { z } from 'zod';

/** As the API sends it: the contract's fields, plus the ones the web drops. */
type AppointmentPayload = z.input<typeof appointmentSchema> &
  Record<string, unknown>;

/** The ids the handlers know: each one a case of `/a/{id}`. */
export const appointmentIds = {
  /** In three days, pending, its confirmation not open yet. */
  upcoming: '11111111-1111-4111-8111-111111111111',
  /** Tomorrow, within the 24 h: it can be confirmed now. */
  confirmable: '22222222-2222-4222-8222-222222222222',
  confirmed: '33333333-3333-4333-8333-333333333333',
  /** The specialist cancelled it, with a reason. */
  cancelled: '44444444-4444-4444-8444-444444444444',
  completed: '55555555-5555-4555-8555-555555555555',
  /** Started ten minutes ago: nothing can be changed any more. */
  started: '66666666-6666-4666-8666-666666666666',
  /** Booked for someone in the patient's care. */
  dependent: '77777777-7777-4777-8777-777777777777',
  /** The specialist moved it: back to pending. */
  rescheduled: '88888888-8888-4888-8888-888888888888',
  /** Another account's: 403. */
  someoneElse: '99999999-9999-4999-8999-999999999999',
  /** No appointment has it: 404. */
  missing: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
} as const;

export const officeId = 'b1b2b3b4-0000-4000-8000-000000000001';

/** A slot the handlers say someone else just took (ERR_4002). */
export const takenStartTime = '10:00';

const caracasOffsetHours = -4; // Venezuela keeps UTC−4 all year.

/** The office's wall clock for an instant: what the API's `slot` carries. */
export function slotAt(start: Date, minutes = 30) {
  const local = new Date(start.getTime() + caracasOffsetHours * 3_600_000);
  const end = new Date(start.getTime() + minutes * 60_000);
  const localEnd = new Date(end.getTime() + caracasOffsetHours * 3_600_000);
  const hhmm = (date: Date) => date.toISOString().slice(11, 16);
  return {
    date: local.toISOString().slice(0, 10),
    startTime: hhmm(local),
    endTime: hhmm(localEnd),
    timezone: 'America/Caracas',
    startsAtUtc: start.toISOString(),
    endsAtUtc: end.toISOString(),
    slotDurationMinutes: minutes,
  };
}

/** An instant `hours` from now, on the hour. */
export function hoursFromNow(hours: number, now = new Date()): Date {
  const date = new Date(now.getTime() + hours * 3_600_000);
  date.setUTCMinutes(0, 0, 0);
  return date;
}

/** What `GET /scheduling/appointments/{id}` answers inside `appointment`. */
export function buildAppointment(
  overrides: Partial<AppointmentPayload> = {},
  start: Date = hoursFromNow(72),
): AppointmentPayload {
  return {
    id: appointmentIds.upcoming,
    patientUserId: knownUserId,
    specialistId: '5b8e2c14-3f1a-4d7e-9c2b-7a1e0f6d4b92',
    officeId,
    createdByUserId: knownUserId,
    forSelf: true,
    terceroId: null,
    slot: slotAt(start),
    price: {
      type: 'RANGE',
      currency: 'USD',
      amount: null,
      minAmount: 25,
      maxAmount: 50,
    },
    attendee: { firstName: 'Ana', lastName: 'Pérez' },
    specialistName: 'Dra. María González',
    specialistPhotoUrl: null,
    specialistSpecialties: [
      { id: 'a0000000-0000-4000-8000-000000000014', name: 'Pediatría' },
    ],
    officeName: 'Clínica Canaima',
    officeAddress:
      'Av. Francisco de Miranda, Torre Canaima, piso 3, Los Palos Grandes, Caracas',
    officeDescription: 'Consultorio 3-B, a la derecha al salir del ascensor',
    officeLatitude: 10.4961,
    officeLongitude: -66.8467,
    reasonName: 'Control pediátrico',
    status: 'PENDING_CONFIRMATION',
    persistedStatus: 'PENDING_CONFIRMATION',
    statusIsComputed: false,
    confirmedAt: null,
    cancelledBy: null,
    cancelReason: null,
    cancelledAt: null,
    rescheduleHistory: [],
    isRescheduled: false,
    canConfirmNow: false,
    confirmationWindowOpensAt: new Date(
      start.getTime() - 24 * 3_600_000,
    ).toISOString(),
    notes: null,
    ...overrides,
  };
}

/** The appointment each known id answers, or undefined for the others. */
export function appointmentFor(
  id: string,
  now = new Date(),
): AppointmentPayload | undefined {
  switch (id) {
    case appointmentIds.upcoming:
      return buildAppointment({}, hoursFromNow(72, now));
    case appointmentIds.confirmable:
      return buildAppointment(
        { id, canConfirmNow: true },
        hoursFromNow(20, now),
      );
    case appointmentIds.confirmed:
      return buildAppointment(
        { id, status: 'CONFIRMED', confirmedAt: now.toISOString() },
        hoursFromNow(48, now),
      );
    case appointmentIds.cancelled:
      return buildAppointment(
        {
          id,
          status: 'CANCELLED',
          cancelledBy: 'SPECIALIST',
          cancelReason: 'Tuve una emergencia en el hospital.',
          cancelledAt: now.toISOString(),
        },
        hoursFromNow(48, now),
      );
    case appointmentIds.completed:
      return buildAppointment(
        { id, status: 'COMPLETED' },
        hoursFromNow(-72, now),
      );
    case appointmentIds.started:
      return buildAppointment(
        { id, status: 'CONFIRMED' },
        new Date(now.getTime() - 10 * 60_000),
      );
    case appointmentIds.dependent:
      return buildAppointment(
        {
          id,
          forSelf: false,
          terceroId: 'c0c0c0c0-0000-4000-8000-000000000001',
          attendee: {
            firstName: 'Sofía',
            lastName: 'Pérez',
            dateOfBirth: '2019-03-01',
            sex: 'FEMALE',
          },
        },
        hoursFromNow(96, now),
      );
    case appointmentIds.rescheduled:
      return buildAppointment(
        { id, isRescheduled: true },
        hoursFromNow(120, now),
      );
    default:
      return undefined;
  }
}
