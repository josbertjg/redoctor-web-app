import { QueryClient } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import {
  buildAppointment,
  officeId,
  takenStartTime,
} from '@/tests/factories/appointments';
import { bookingIds } from '@/tests/factories/booking';
import { knownSpecialistId } from '@/tests/factories/specialists';

import {
  bookAppointment,
  isInactiveSpecialist,
  officeServicesQueryOptions,
  tercerosQueryOptions,
} from './booking';
import { apiUrl } from '../../../tests/msw/api-url';
import { validToken } from '../../../tests/msw/handlers/identity';
import { server } from '../../../tests/msw/server';

import type { BookingRequest } from '../schemas/booking';

const user = { id: 'uid-1', getToken: () => Promise.resolve(validToken) };

const request: BookingRequest = {
  specialistId: knownSpecialistId,
  officeId,
  date: '2026-11-03',
  startTime: '08:30',
  specialtyId: bookingIds.internalMedicine,
  consultationReasonId: bookingIds.generalReason,
  attendee: { kind: 'self' },
};

describe('what a booking reads', () => {
  it('reads an office’s reasons with their prices, and the people in one’s care', async () => {
    const client = new QueryClient();

    const reasons = await client.query(
      officeServicesQueryOptions(user, officeId),
    );
    const terceros = await client.query(tercerosQueryOptions(user));

    expect(reasons.map((reason) => reason.name)).toEqual([
      'Consulta general',
      'Control',
    ]);
    expect(terceros.map((tercero) => tercero.firstName)).toEqual(['Sofía']);
  });

  it('says a specialist is not active when the office answers 404', async () => {
    const client = new QueryClient();
    const read = client.query({
      ...officeServicesQueryOptions(user, bookingIds.inactiveOffice),
      retry: false,
    });
    await expect(read).rejects.toSatisfy(isInactiveSpecialist);
  });
});

describe('booking', () => {
  it('books, and the appointment is born pending', async () => {
    const appointment = await bookAppointment(user, request);
    expect(appointment).toMatchObject({
      id: bookingIds.booked,
      status: 'PENDING_CONFIRMATION',
      slot: { date: '2026-11-03', startTime: '08:30' },
    });
  });

  it('leaves a slot just taken to the flow to explain', async () => {
    await expect(
      bookAppointment(user, { ...request, startTime: takenStartTime }),
    ).rejects.toMatchObject({ code: 'ERR_4002' });
  });

  it('looks for the booking when the answer is lost, and never sends it twice', async () => {
    let posts = 0;
    const landed = buildAppointment(
      { specialistId: knownSpecialistId, officeId },
      new Date('2026-11-03T08:30:00-04:00'),
    );
    server.use(
      http.post(apiUrl('/scheduling/appointments'), () => {
        posts += 1;
        return HttpResponse.error();
      }),
      http.get(apiUrl('/scheduling/appointments'), ({ request: read }) => {
        const query = new URL(read.url).searchParams;
        // The day and the day after, whether the API counts `to` in or out.
        expect([query.get('from'), query.get('to')]).toEqual([
          '2026-11-03',
          '2026-11-04',
        ]);
        return HttpResponse.json({ appointments: [landed] });
      }),
    );

    await expect(bookAppointment(user, request)).resolves.toMatchObject({
      id: landed.id,
    });
    expect(posts).toBe(1);
  });

  it('counts a slot taken by this very booking — a second tab — as booked', async () => {
    const landed = buildAppointment(
      { specialistId: knownSpecialistId, officeId },
      new Date('2026-11-03T08:30:00-04:00'),
    );
    server.use(
      http.post(apiUrl('/scheduling/appointments'), () =>
        HttpResponse.json(
          { code: 'ERR_4002', message: 'Slot taken' },
          { status: 409 },
        ),
      ),
      http.get(apiUrl('/scheduling/appointments'), () =>
        HttpResponse.json({ appointments: [landed] }),
      ),
    );

    await expect(bookAppointment(user, request)).resolves.toMatchObject({
      id: landed.id,
    });
  });
});
