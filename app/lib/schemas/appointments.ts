import { z } from 'zod';

import { isDocumentType, type DocumentType } from '../format/identity-document';

/*
 * An appointment as the API sends it (AGENTS.md §5): the invitation (M4),
 * the appointment page (M5) and the patient's list (M6) share this shape.
 * Only what the web shows or decides with is parsed; the rest is dropped.
 * The reason and the specialist's notes never leave this module for
 * analytics, logs or previews (AGENTS.md §11).
 */

export const appointmentStatuses = [
  'PENDING_CONFIRMATION',
  'CONFIRMED',
  'RESCHEDULE_PROPOSED',
  'CANCELLED',
  'COMPLETED',
  'NO_SHOW',
] as const;

export type AppointmentStatus = (typeof appointmentStatuses)[number];

const slotSchema = z.object({
  /** The calendar day in the office's zone (YYYY-MM-DD): never shifted. */
  date: z.string(),
  /** Wall-clock times in the office's zone (HH:mm). */
  startTime: z.string(),
  endTime: z.string(),
  timezone: z.string(),
  /** The instants it starts and ends, for comparisons with now and calendars. */
  startsAtUtc: z.string(),
  endsAtUtc: z.string().nullish(),
});

export const priceTypes = ['FIXED', 'RANGE', 'FROM'] as const;

const priceSchema = z.object({
  type: z.enum(priceTypes).nullish(),
  currency: z.string().nullish(),
  amount: z.number().nullish(),
  minAmount: z.number().nullish(),
  maxAmount: z.number().nullish(),
});

export const appointmentSchema = z.object({
  id: z.string(),
  /** Whose account holds it: null while an invitation waits to be claimed. */
  patientUserId: z.string().nullish(),
  specialistId: z.string(),
  /** The office whose slots a reschedule chooses from (the same office only). */
  officeId: z.string().nullish(),
  forSelf: z.boolean().nullish(),
  slot: slotSchema,
  price: priceSchema.nullish(),
  /** Who attends: the patient, or the relative it was booked for. */
  attendee: z.object({
    firstName: z.string(),
    lastName: z.string(),
    dateOfBirth: z.string().nullish(),
    sex: z.string().nullish(),
    documentType: z.string().nullish(),
    documentNumber: z.string().nullish(),
  }),
  specialistName: z.string().nullish(),
  specialistPhotoUrl: z.string().nullish(),
  specialistSpecialties: z
    .array(z.object({ id: z.string(), name: z.string() }))
    .nullish(),
  officeName: z.string().nullish(),
  officeAddress: z.string().nullish(),
  officeDescription: z.string().nullish(),
  officeLatitude: z.number().nullish(),
  officeLongitude: z.number().nullish(),
  reasonName: z.string().nullish(),
  status: z.enum(appointmentStatuses),
  /** The patient may confirm now: from 24 h before it starts. */
  canConfirmNow: z.boolean().nullish(),
  confirmationWindowOpensAt: z.string().nullish(),
  cancelledBy: z.string().nullish(),
  cancelReason: z.string().nullish(),
  cancelledAt: z.string().nullish(),
  isRescheduled: z.boolean().nullish(),
  /** Every move, oldest first: from which slot, to which, by whom. */
  rescheduleHistory: z
    .array(
      z.object({
        by: z.string().nullish(),
        from: z.object({ date: z.string(), startTime: z.string() }),
        to: z.object({ date: z.string(), startTime: z.string() }),
      }),
    )
    .nullish(),
  /** The specialist's notes for the patient (the app shows them). */
  notes: z.string().nullish(),
});

/** `GET /scheduling/appointments/{id}` and every write on it answer the appointment. */
export const appointmentResponseSchema = z.object({
  appointment: appointmentSchema,
});

export type AppointmentResponse = z.infer<typeof appointmentSchema>;

/** What a page shows of an appointment: who, when, where, how much, why. */
export type AppointmentSummary = {
  id: string;
  specialist: {
    id: string;
    name: string | null;
    photo: string | null;
    specialties: string[];
  };
  /** Calendar day and wall-clock start and end in the office's zone. */
  date: string;
  startTime: string;
  endTime: string;
  /** The instants it starts and ends (the end may be missing). */
  startsAt: string;
  endsAt: string | null;
  office: {
    id: string | null;
    name: string | null;
    address: string | null;
    description: string | null;
    coordinates: { latitude: number; longitude: number } | null;
  };
  price: AppointmentResponse['price'];
  /** Health information: shown to the patient, never sent anywhere else. */
  reason: string | null;
  /** The specialist's notes for the patient. */
  notes: string | null;
  /** The account (the API's id) that holds it. */
  patientId: string | null;
  attendee: {
    firstName: string;
    lastName: string;
    /** Someone in one's care: what the app shows of them. */
    dateOfBirth: string | null;
    sex: 'MALE' | 'FEMALE' | null;
    document: { type: DocumentType; number: string } | null;
  };
  /** Booked for someone in the account holder's care. */
  forDependent: boolean;
  status: AppointmentStatus;
  canConfirmNow: boolean;
  /** When the confirmation opens (24 h before), while it has not. */
  confirmationOpensAt: string | null;
  cancellation: {
    by: string | null;
    reason: string | null;
    /** The instant it was cancelled. */
    at: string | null;
  } | null;
  rescheduled: boolean;
  /** Every move, oldest first. */
  rescheduleHistory: {
    by: string | null;
    from: { date: string; startTime: string };
    to: { date: string; startTime: string };
  }[];
};

const blank = (value: string | null | undefined) =>
  value === null || value === undefined || value.trim() === '' ? null : value;

export function toAppointmentSummary(
  appointment: AppointmentResponse,
): AppointmentSummary {
  const { officeLatitude: latitude, officeLongitude: longitude } = appointment;
  return {
    id: appointment.id,
    specialist: {
      id: appointment.specialistId,
      name: blank(appointment.specialistName),
      photo: blank(appointment.specialistPhotoUrl),
      specialties: (appointment.specialistSpecialties ?? []).map(
        (specialty) => specialty.name,
      ),
    },
    date: appointment.slot.date,
    startTime: appointment.slot.startTime,
    endTime: appointment.slot.endTime,
    startsAt: appointment.slot.startsAtUtc,
    endsAt: appointment.slot.endsAtUtc ?? null,
    office: {
      id: appointment.officeId ?? null,
      name: blank(appointment.officeName),
      address: blank(appointment.officeAddress),
      description: blank(appointment.officeDescription),
      coordinates:
        typeof latitude === 'number' && typeof longitude === 'number'
          ? { latitude, longitude }
          : null,
    },
    price: appointment.price ?? null,
    reason: blank(appointment.reasonName),
    notes: blank(appointment.notes),
    patientId: appointment.patientUserId ?? null,
    attendee: toAttendee(appointment.attendee),
    forDependent: appointment.forSelf === false,
    status: appointment.status,
    canConfirmNow: appointment.canConfirmNow ?? false,
    confirmationOpensAt: appointment.confirmationWindowOpensAt ?? null,
    cancellation:
      appointment.status === 'CANCELLED'
        ? {
            by: appointment.cancelledBy ?? null,
            reason: blank(appointment.cancelReason),
            at: appointment.cancelledAt ?? null,
          }
        : null,
    rescheduled: appointment.isRescheduled ?? false,
    rescheduleHistory: (appointment.rescheduleHistory ?? []).map((move) => ({
      by: move.by ?? null,
      from: move.from,
      to: move.to,
    })),
  };
}

function toAttendee(
  attendee: AppointmentResponse['attendee'],
): AppointmentSummary['attendee'] {
  const documentNumber = blank(attendee.documentNumber);
  const documentType = attendee.documentType ?? '';
  return {
    firstName: attendee.firstName,
    lastName: attendee.lastName,
    dateOfBirth:
      /^\d{4}-\d{2}-\d{2}/.exec(attendee.dateOfBirth ?? '')?.[0] ?? null,
    sex:
      attendee.sex === 'MALE' || attendee.sex === 'FEMALE'
        ? attendee.sex
        : null,
    document:
      documentNumber && isDocumentType(documentType)
        ? { type: documentType, number: documentNumber }
        : null,
  };
}

const terminalStatuses: ReadonlySet<AppointmentStatus> = new Set([
  'CANCELLED',
  'COMPLETED',
  'NO_SHOW',
]);

/** The app's chip for each status: its words (`appointments.status.*`) and its tone. */
export const statusChips = {
  PENDING_CONFIRMATION: { label: 'pending', tone: 'warning' },
  CONFIRMED: { label: 'confirmed', tone: 'positive' },
  RESCHEDULE_PROPOSED: { label: 'rescheduled', tone: 'accent' },
  CANCELLED: { label: 'cancelled', tone: 'error' },
  COMPLETED: { label: 'finished', tone: 'info' },
  NO_SHOW: { label: 'noShow', tone: 'neutral' },
} as const satisfies Record<
  AppointmentStatus,
  {
    label: string;
    tone: 'warning' | 'positive' | 'accent' | 'error' | 'info' | 'neutral';
  }
>;

export type AppointmentActions = {
  /** «Confirmar cita» now, or the time it opens, or nothing. */
  confirm: { kind: 'now' } | { kind: 'later'; opensAt: string } | null;
  /** Reschedule and cancel. */
  change: boolean;
  /** «Agregar al calendario». */
  calendar: boolean;
};

/**
 * What the patient can do with their appointment, as the app offers it,
 * except that nothing changes once it has started (the app waits for its
 * end; REDOC-308 asks the API to stop at the start too): the confirmation
 * while it is pending and its window open, the hint of when it opens, and
 * rescheduling or cancelling while it is not over.
 */
export function appointmentActions(
  appointment: AppointmentSummary,
  now: Date = new Date(),
): AppointmentActions {
  const startsAt = new Date(appointment.startsAt).getTime();
  const ahead =
    !terminalStatuses.has(appointment.status) &&
    !Number.isNaN(startsAt) &&
    now.getTime() < startsAt;
  const pending = ahead && appointment.status === 'PENDING_CONFIRMATION';
  const opensAt = appointment.confirmationOpensAt;

  let confirm: AppointmentActions['confirm'] = null;
  if (pending && appointment.canConfirmNow) confirm = { kind: 'now' };
  else if (pending && opensAt && new Date(opensAt).getTime() > now.getTime())
    confirm = { kind: 'later', opensAt };

  return { confirm, change: ahead, calendar: ahead };
}
