import { QueryClient } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import {
  appointmentIds,
  buildAppointment,
  officeId,
  takenStartTime,
} from '@/tests/factories/appointments';

import {
  appointmentQueryOptions,
  availableDaysQueryOptions,
  cancelAppointment,
  confirmAppointment,
  daySlotsQueryOptions,
  rescheduleAppointment,
  specialistAppointmentsQueryOptions,
} from './appointments';
import { apiUrl } from '../../../tests/msw/api-url';
import { validToken } from '../../../tests/msw/handlers/identity';
import { server } from '../../../tests/msw/server';

const user = { id: 'uid-1', getToken: () => Promise.resolve(validToken) };

const read = (id: string) =>
  new QueryClient().query(appointmentQueryOptions(user, id));

describe('appointmentQueryOptions', () => {
  it('reads the patient’s appointment', async () => {
    const result = await read(appointmentIds.upcoming);
    expect(result.kind).toBe('found');
  });

  it('tells another account’s appointment from one that does not exist', async () => {
    await expect(read(appointmentIds.someoneElse)).resolves.toEqual({
      kind: 'not-yours',
    });
    await expect(read(appointmentIds.missing)).resolves.toEqual({
      kind: 'not-found',
    });
  });
});

describe('the patient’s changes', () => {
  it('confirms inside the window and is refused outside it', async () => {
    const confirmed = await confirmAppointment(
      user,
      appointmentIds.confirmable,
    );
    expect(confirmed.status).toBe('CONFIRMED');

    await expect(
      confirmAppointment(user, appointmentIds.upcoming),
    ).rejects.toMatchObject({ status: 409, code: 'ERR_4013' });
  });

  it('cancels without a reason', async () => {
    const cancelled = await cancelAppointment(user, appointmentIds.upcoming);
    expect(cancelled.status).toBe('CANCELLED');
    expect(cancelled.cancelledBy).toBe('PATIENT');
  });

  it('moves it to another slot, which goes back to pending', async () => {
    const moved = await rescheduleAppointment(user, appointmentIds.confirmed, {
      date: '2026-11-03',
      startTime: '14:00',
    });
    expect(moved.slot.date).toBe('2026-11-03');
    expect(moved.slot.startTime).toBe('14:00');
    expect(moved.status).toBe('PENDING_CONFIRMATION');
  });

  it('is refused a slot someone else just took', async () => {
    await expect(
      rescheduleAppointment(user, appointmentIds.upcoming, {
        date: '2026-11-03',
        startTime: takenStartTime,
      }),
    ).rejects.toMatchObject({ status: 409, code: 'ERR_4002' });
  });
});

describe('an office’s free time', () => {
  it('reads a month’s days and a day’s slots', async () => {
    const client = new QueryClient();
    const days = await client.query(
      availableDaysQueryOptions(user, officeId, '2099-03'),
    );
    expect(days.days).toHaveLength(31);

    const slots = await client.query(
      daySlotsQueryOptions(user, officeId, '2099-03-02'),
    );
    expect(slots.slots.length).toBeGreaterThan(0);
  });
});

describe('appointmentsQueryOptions', () => {
  it('lists every appointment of the patient', async () => {
    const { appointmentsQueryOptions } = await import('./appointments');
    const { knownUserId } = await import('@/tests/factories/identity');
    const appointments = await new QueryClient().query(
      appointmentsQueryOptions(user),
    );

    expect(appointments.length).toBeGreaterThan(5);
    expect(
      appointments.every(
        (appointment) => appointment.patientUserId === knownUserId,
      ),
    ).toBe(true);
    expect(appointments.map((appointment) => appointment.id)).not.toContain(
      appointmentIds.someoneElse,
    );
  });
});

describe('specialistAppointmentsQueryOptions', () => {
  it('reads every page of the agenda, as the app does', async () => {
    const pages: number[] = [];
    server.use(
      http.get(apiUrl('/scheduling/specialist/appointments'), ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get('page'));
        pages.push(page);
        const size = page === 1 ? 100 : 50;
        return HttpResponse.json({
          appointments: Array.from({ length: size }, (_, index) =>
            buildAppointment({ id: `${String(page)}-${String(index)}` }),
          ),
          total: 150,
          page,
          pageSize: 100,
        });
      }),
    );

    const appointments = await new QueryClient().query(
      specialistAppointmentsQueryOptions(user, { from: '2026-10-01' }),
    );
    expect(appointments).toHaveLength(150);
    expect(pages).toEqual([1, 2]);
  });

  it('asks with the filters the API takes', async () => {
    let query: URLSearchParams | undefined;
    server.use(
      http.get(apiUrl('/scheduling/specialist/appointments'), ({ request }) => {
        query = new URL(request.url).searchParams;
        return HttpResponse.json({ appointments: [], total: 0 });
      }),
    );

    await new QueryClient().query(
      specialistAppointmentsQueryOptions(user, {
        from: '2026-10-01',
        to: '2026-10-14',
        status: 'CANCELLED',
        search: 'rosa',
      }),
    );
    expect(Object.fromEntries(query ?? [])).toEqual({
      from: '2026-10-01',
      to: '2026-10-14',
      status: 'CANCELLED',
      search: 'rosa',
      page: '1',
      pageSize: '100',
    });
  });
});
