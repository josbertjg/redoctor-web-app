import { z } from 'zod';

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
  /** The instant it starts, for comparisons with now. */
  startsAtUtc: z.string(),
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
  forSelf: z.boolean().nullish(),
  slot: slotSchema,
  price: priceSchema.nullish(),
  /** Who attends: the patient, or the relative it was booked for. */
  attendee: z.object({ firstName: z.string(), lastName: z.string() }),
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
  /** Calendar day and wall-clock start in the office's zone. */
  date: string;
  startTime: string;
  office: {
    name: string | null;
    address: string | null;
    description: string | null;
    coordinates: { latitude: number; longitude: number } | null;
  };
  price: AppointmentResponse['price'];
  /** Health information: shown to the patient, never sent anywhere else. */
  reason: string | null;
  attendee: { firstName: string; lastName: string };
  status: AppointmentStatus;
  canConfirmNow: boolean;
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
    office: {
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
    attendee: appointment.attendee,
    status: appointment.status,
    canConfirmNow: appointment.canConfirmNow ?? false,
  };
}
