import { describe, expect, it } from 'vitest';

import { buildAppointment } from '@/tests/factories/appointments';
import { buildOfficeServices, buildTerceros } from '@/tests/factories/booking';

import { appointmentSchema } from './appointments';
import {
  bookingSpecialtyId,
  isThisBooking,
  officeServicesSchema,
  terceroNeedsDocument,
  tercerosResponseSchema,
  toBookingBody,
  toBookingReasons,
  toTerceros,
  type BookingRequest,
} from './booking';

import type { Specialty } from './specialties';

describe('an office’s reasons', () => {
  it('prices each one as the app does: its own per reason, else the standard', () => {
    const reasons = toBookingReasons(
      officeServicesSchema.parse(buildOfficeServices()),
    );
    expect(
      reasons.map((reason) => [reason.name, reason.price?.amount]),
    ).toEqual([
      ['Consulta general', 40],
      ['Control', 25],
    ]);
  });

  it('gives every reason the standard price in the standard mode', () => {
    const reasons = toBookingReasons(
      officeServicesSchema.parse(
        buildOfficeServices({ pricingMode: 'STANDARD' }),
      ),
    );
    expect(reasons.map((reason) => reason.price?.amount)).toEqual([40, 40]);
  });

  it('leaves a reason without a price when the office has none', () => {
    const [reason] = toBookingReasons(
      officeServicesSchema.parse(buildOfficeServices({ standardPrice: null })),
    );
    expect(reason?.price).toBeNull();
  });

  it('reads an unknown pricing mode as the standard one', () => {
    const services = officeServicesSchema.parse({
      ...buildOfficeServices(),
      pricingMode: 'SOMETHING_NEW',
    });
    expect(services.pricingMode).toBe('STANDARD');
  });
});

describe('the people in one’s care', () => {
  it('keeps who they are, without the API’s deleted ones', () => {
    const response = buildTerceros();
    const terceros = toTerceros(
      tercerosResponseSchema.parse({
        terceros: [
          ...response.terceros,
          {
            ...response.terceros[0],
            id: 'gone',
            deletedAt: '2026-10-01T00:00:00.000Z',
          },
        ],
      }),
    );
    expect(terceros).toEqual([
      {
        id: 'c0c0c0c0-0000-4000-8000-000000000001',
        firstName: 'Sofía',
        lastName: 'Pérez',
        dateOfBirth: '2019-03-01',
        sex: 'FEMALE',
        document: null,
      },
    ]);
  });

  it('asks for a document from 9 years and a month, the day falling on the month’s last', () => {
    expect(terceroNeedsDocument('2017-09-14', '2026-10-13')).toBe(false);
    expect(terceroNeedsDocument('2017-09-13', '2026-10-13')).toBe(true);
    // Born on 31 January: 9 years and a month is the last day of February.
    expect(terceroNeedsDocument('2017-01-31', '2026-02-27')).toBe(false);
    expect(terceroNeedsDocument('2017-01-31', '2026-02-28')).toBe(true);
    // December's month runs into January of the next year.
    expect(terceroNeedsDocument('2016-12-05', '2026-01-04')).toBe(false);
    expect(terceroNeedsDocument('2016-12-05', '2026-01-05')).toBe(true);
    // A date that is not one asks for it.
    expect(terceroNeedsDocument('', '2026-10-13')).toBe(true);
  });
});

describe('the specialty a booking sends', () => {
  const tree: Specialty[] = [
    {
      id: 'medicine',
      name: 'Medicina',
      children: [
        { id: 'internal', name: 'Medicina Interna', children: [] },
        { id: 'pediatrics', name: 'Pediatría', children: [] },
      ],
    },
  ];
  const specialty = (name: string, path: string[]) => ({ name, path });

  it('is the profile’s most specific one, found by name in the catalog', () => {
    expect(
      bookingSpecialtyId(
        [
          specialty('Medicina', ['Medicina']),
          specialty('Medicina Interna', ['Medicina', 'Medicina Interna']),
        ],
        tree,
      ),
    ).toBe('internal');
  });

  it('takes the first on a tie, and ignores case and spacing', () => {
    expect(
      bookingSpecialtyId(
        [
          specialty('  pediatría ', ['Medicina', 'Pediatría']),
          specialty('Medicina Interna', ['Medicina', 'Medicina Interna']),
        ],
        tree,
      ),
    ).toBe('pediatrics');
  });

  it('is none when the catalog does not have it, or the profile has none', () => {
    expect(
      bookingSpecialtyId([specialty('Odontología', ['Odontología'])], tree),
    ).toBeNull();
    expect(bookingSpecialtyId([], tree)).toBeNull();
  });
});

describe('the booking', () => {
  const request: BookingRequest = {
    specialistId: 'specialist-1',
    officeId: 'office-1',
    date: '2026-10-20',
    startTime: '15:00',
    specialtyId: 'internal',
    consultationReasonId: 'reason-1',
    attendee: { kind: 'self' },
  };

  it('sends for oneself what the API takes', () => {
    expect(toBookingBody(request)).toEqual({
      specialistId: 'specialist-1',
      officeId: 'office-1',
      date: '2026-10-20',
      startTime: '15:00',
      forSelf: true,
      specialtyId: 'internal',
      consultationReasonId: 'reason-1',
    });
  });

  it('names someone in one’s care by id, and someone new in full', () => {
    const tercero = toTerceros(
      tercerosResponseSchema.parse(buildTerceros()),
    )[0];
    if (tercero === undefined) throw new Error('The fixture has a tercero.');
    expect(
      toBookingBody({
        ...request,
        consultationReasonId: null,
        attendee: { kind: 'tercero', tercero },
      }),
    ).toEqual({
      specialistId: 'specialist-1',
      officeId: 'office-1',
      date: '2026-10-20',
      startTime: '15:00',
      forSelf: false,
      specialtyId: 'internal',
      terceroId: tercero.id,
    });

    const person = {
      firstName: 'Luis',
      lastName: 'Pérez',
      dateOfBirth: '2010-05-02',
      sex: 'MALE' as const,
    };
    expect(
      toBookingBody({
        ...request,
        attendee: {
          kind: 'new',
          person: { ...person, document: { type: 'V', number: '30111222' } },
        },
      }).tercero,
    ).toEqual({ ...person, documentType: 'V', documentNumber: '30111222' });
    expect(
      toBookingBody({
        ...request,
        attendee: { kind: 'new', person: { ...person, document: null } },
      }).tercero,
    ).toEqual(person);
  });

  it('recognizes itself among the patient’s appointments, unless cancelled', () => {
    const at = new Date('2026-10-20T15:00:00-04:00');
    const appointment = appointmentSchema.parse(
      buildAppointment(
        { specialistId: 'specialist-1', officeId: 'office-1' },
        at,
      ),
    );
    expect(isThisBooking(appointment, request)).toBe(true);
    expect(
      isThisBooking({ ...appointment, status: 'CANCELLED' }, request),
    ).toBe(false);
    expect(isThisBooking(appointment, { ...request, startTime: '15:30' })).toBe(
      false,
    );
  });
});
