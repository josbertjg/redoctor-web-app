import { z } from 'zod';

import { priceSchema, type Price } from './price';
import { flattenSpecialties, type Specialty } from './specialties';
import { isDocumentType, type DocumentType } from '../format/identity-document';

import type { AppointmentResponse } from './appointments';

/*
 * What a patient needs to book an appointment from a specialist's profile
 * (`POST /scheduling/appointments`), as the app's booking sheet gathers
 * it: the office's consultation reasons with their prices, the people in
 * the patient's care (the API's «terceros») and the specialty the API asks
 * for. Every read needs the patient's session: the public profile carries
 * no reasons, prices or specialty ids yet (REDOC-367). The booking is born
 * pending, and the patient confirms it from 24 h before (`/a/{id}`).
 */

/* ---------- Consultation reasons and their prices ------------------------ */

/**
 * `GET /scheduling/offices/{officeId}/services`: the reasons enabled at an
 * office, with the office's pricing mode and its standard price.
 */
export const officeServicesSchema = z.object({
  pricingMode: z.enum(['STANDARD', 'PER_REASON']).catch('STANDARD'),
  standardPrice: priceSchema.nullish(),
  reasons: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      price: priceSchema.nullish(),
    }),
  ),
});

export type OfficeServicesResponse = z.output<typeof officeServicesSchema>;

export type BookingReason = {
  id: string;
  name: string;
  /** Null when the specialist set none: the app shows no price then. */
  price: Price | null;
};

const isSet = (price: Price | null | undefined): price is Price =>
  Boolean(price?.type);

/**
 * Each reason with the price the app gives it (`OfficeServices.priceFor`):
 * per reason, its own when it has one and the standard one otherwise; in
 * the standard mode, the standard one always.
 */
export function toBookingReasons(
  services: OfficeServicesResponse,
): BookingReason[] {
  const standard = isSet(services.standardPrice)
    ? services.standardPrice
    : null;
  return services.reasons.map((reason) => ({
    id: reason.id,
    name: reason.name.trim(),
    price:
      services.pricingMode === 'PER_REASON' && isSet(reason.price)
        ? reason.price
        : standard,
  }));
}

/* ---------- The people in the patient's care ----------------------------- */

const terceroSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  dateOfBirth: z.string(),
  sex: z.string().nullish(),
  documentType: z.string().nullish(),
  documentNumber: z.string().nullish(),
  deletedAt: z.string().nullish().catch(null),
});

/** `GET /scheduling/terceros`: everyone the patient has booked for. */
export const tercerosResponseSchema = z.object({
  terceros: z.array(terceroSchema),
});

export type TercerosResponse = z.output<typeof tercerosResponseSchema>;

export type BookingSex = 'MALE' | 'FEMALE';

export type Tercero = {
  id: string;
  firstName: string;
  lastName: string;
  /** A calendar date (YYYY-MM-DD): never shifted. */
  dateOfBirth: string;
  sex: BookingSex | null;
  document: { type: DocumentType; number: string } | null;
};

export function toTerceros(response: TercerosResponse): Tercero[] {
  return response.terceros
    .filter((tercero) => !tercero.deletedAt)
    .map((tercero) => {
      const type = tercero.documentType ?? '';
      const number = tercero.documentNumber?.trim() ?? '';
      return {
        id: tercero.id,
        firstName: tercero.firstName.trim(),
        lastName: tercero.lastName.trim(),
        dateOfBirth:
          /^\d{4}-\d{2}-\d{2}/.exec(tercero.dateOfBirth)?.[0] ??
          tercero.dateOfBirth,
        sex:
          tercero.sex === 'MALE' || tercero.sex === 'FEMALE'
            ? tercero.sex
            : null,
        document:
          number !== '' && isDocumentType(type) ? { type, number } : null,
      };
    });
}

const pad = (value: number, length = 2) => String(value).padStart(length, '0');

/**
 * Whether someone in one's care must carry a document: from 9 years and a
 * month (the API's rule, the app's IdentityDocument), the day falling on
 * the month's last when that month is shorter. A date that is not one asks
 * for it.
 */
export function terceroNeedsDocument(
  dateOfBirth: string,
  today: string,
): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth);
  if (!match) return true;
  let year = Number(match[1]) + 9;
  let month = Number(match[2]) + 1;
  if (month > 12) {
    month = 1;
    year += 1;
  }
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const day = Math.min(Number(match[3]), lastDay);
  return today >= `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

/* ---------- The specialty the API asks for ------------------------------- */

const comparable = (name: string) =>
  name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es');

/**
 * The specialty sent with a booking (`specialtyId`, which the API requires
 * until REDOC-251), as the app finds it (`booking_specialty.dart`,
 * provisional): the profile's most specific verified specialty — the
 * longest path, the first on a tie — looked up by name in the catalog.
 * Null when the catalog does not have it.
 */
export function bookingSpecialtyId(
  specialties: readonly { name: string; path: readonly string[] }[],
  tree: readonly Specialty[],
): string | null {
  let chosen: { name: string; path: readonly string[] } | null = null;
  for (const specialty of specialties) {
    if (chosen === null || specialty.path.length > chosen.path.length) {
      chosen = specialty;
    }
  }
  if (chosen === null) return null;
  const name = comparable(chosen.name);
  return (
    flattenSpecialties(tree).find((node) => comparable(node.name) === name)
      ?.id ?? null
  );
}

/* ---------- The booking --------------------------------------------------- */

/** Someone in one's care booked for the first time: the API keeps them. */
export type NewTercero = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sex: BookingSex;
  /** Only from 9 years and a month (`terceroNeedsDocument`). */
  document: { type: DocumentType; number: string } | null;
};

/** Who attends: the account holder, someone in their care, or someone new. */
export type BookingAttendee =
  | { kind: 'self' }
  | { kind: 'tercero'; tercero: Tercero }
  | { kind: 'new'; person: NewTercero };

export type BookingRequest = {
  specialistId: string;
  officeId: string;
  /** The office's calendar day and wall-clock start, as its slots say them. */
  date: string;
  startTime: string;
  specialtyId: string;
  consultationReasonId: string | null;
  attendee: BookingAttendee;
};

/** The body as the API takes it (the app's `toBookRequest`). */
export function toBookingBody(request: BookingRequest) {
  const { attendee } = request;
  return {
    specialistId: request.specialistId,
    officeId: request.officeId,
    date: request.date,
    startTime: request.startTime,
    forSelf: attendee.kind === 'self',
    specialtyId: request.specialtyId,
    ...(request.consultationReasonId === null
      ? {}
      : { consultationReasonId: request.consultationReasonId }),
    ...(attendee.kind === 'tercero' ? { terceroId: attendee.tercero.id } : {}),
    ...(attendee.kind === 'new'
      ? {
          tercero: {
            firstName: attendee.person.firstName,
            lastName: attendee.person.lastName,
            dateOfBirth: attendee.person.dateOfBirth,
            sex: attendee.person.sex,
            ...(attendee.person.document
              ? {
                  documentType: attendee.person.document.type,
                  documentNumber: attendee.person.document.number,
                }
              : {}),
          },
        }
      : {}),
  };
}

/**
 * Whether an appointment of the patient's list is this booking — the same
 * specialist, office, day and hour, not cancelled —: what the app looks
 * for after a lost answer, before sending it again.
 */
export function isThisBooking(
  appointment: AppointmentResponse,
  request: BookingRequest,
): boolean {
  return (
    appointment.specialistId === request.specialistId &&
    appointment.officeId === request.officeId &&
    appointment.slot.date === request.date &&
    appointment.slot.startTime.slice(0, 5) === request.startTime &&
    appointment.status !== 'CANCELLED'
  );
}
