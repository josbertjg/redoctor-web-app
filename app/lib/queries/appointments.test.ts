import { QueryClient } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import {
  appointmentIds,
  buildAppointment,
  officeId,
  specialistPatientIds,
  takenStartTime,
} from '@/tests/factories/appointments';

import {
  appointmentInvitationQueryOptions,
  appointmentQueryOptions,
  availableDaysQueryOptions,
  bookAsSpecialist,
  cancelAppointment,
  cancelAsSpecialist,
  completeAppointment,
  confirmAppointment,
  daySlotsQueryOptions,
  rescheduleAppointment,
  rescheduleAsSpecialist,
  specialistAppointmentsQueryOptions,
  specialistPatientsQueryOptions,
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

describe('the specialist’s changes', () => {
  it('finishes the consultation, or marks the no-show', async () => {
    const done = await completeAppointment(user, appointmentIds.confirmed, {
      noShow: false,
    });
    expect(done.status).toBe('COMPLETED');

    const missed = await completeAppointment(user, appointmentIds.upcoming, {
      noShow: true,
    });
    expect(missed.status).toBe('NO_SHOW');
  });

  it('cancels as the specialist, asking no reason', async () => {
    const cancelled = await cancelAsSpecialist(user, appointmentIds.upcoming);
    expect(cancelled.status).toBe('CANCELLED');
    expect(cancelled.cancelledBy).toBe('SPECIALIST');
  });

  it('moves it, and is refused an hour someone else just took', async () => {
    const moved = await rescheduleAsSpecialist(user, appointmentIds.confirmed, {
      date: '2026-11-03',
      startTime: '14:00',
    });
    expect(moved.slot.startTime).toBe('14:00');
    expect(moved.status).toBe('PENDING_CONFIRMATION');

    await expect(
      rescheduleAsSpecialist(user, appointmentIds.upcoming, {
        date: '2026-11-03',
        startTime: takenStartTime,
      }),
    ).rejects.toMatchObject({ status: 409, code: 'ERR_4002' });
  });

  it('counts a close that already landed as done', async () => {
    server.use(
      http.post(
        apiUrl('/scheduling/specialist/appointments/:appointmentId/complete'),
        () =>
          HttpResponse.json(
            { code: 'ERR_4005', message: 'Already closed' },
            { status: 409 },
          ),
      ),
      http.get(apiUrl('/scheduling/appointments/:appointmentId'), () =>
        HttpResponse.json({
          appointment: buildAppointment({
            id: appointmentIds.confirmed,
            status: 'COMPLETED',
          }),
        }),
      ),
    );

    const done = await completeAppointment(user, appointmentIds.confirmed, {
      noShow: false,
    });
    expect(done.status).toBe('COMPLETED');
  });

  it('reads the invitation to share, none for a patient with an account', async () => {
    const client = new QueryClient();
    const linked = await client.query(
      appointmentInvitationQueryOptions(user, appointmentIds.upcoming),
    );
    expect(linked).toEqual({ phone: null, token: null, url: null });

    server.use(
      http.get(
        apiUrl('/scheduling/specialist/appointments/:appointmentId/invitation'),
        () =>
          HttpResponse.json({
            appointmentId: appointmentIds.upcoming,
            invitedPhone: '+584141234567',
            invitationToken: 'tok',
            invitationUrl: 'https://redoctorapp.com/i/tok',
          }),
      ),
    );
    const invited = await new QueryClient().query(
      appointmentInvitationQueryOptions(user, appointmentIds.upcoming),
    );
    expect(invited).toEqual({
      phone: '+584141234567',
      token: 'tok',
      url: 'https://redoctorapp.com/i/tok',
    });
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

describe('the specialist books a patient', () => {
  const slot = { officeId, date: '2026-10-20', startTime: '09:00' };

  it('finds their registered patients, with what their account lacks', async () => {
    const patients = await new QueryClient().query(
      specialistPatientsQueryOptions(user, '12345678'),
    );
    expect(patients).toEqual([
      expect.objectContaining({
        userId: specialistPatientIds.laura,
        firstName: 'Laura',
        lastName: 'Gómez',
        document: { type: 'V', number: '12345678' },
        sex: 'FEMALE',
        dateOfBirth: '1990-05-04',
        missing: [],
      }),
    ]);
    const [jorge] = await new QueryClient().query(
      specialistPatientsQueryOptions(user, 'jorge'),
    );
    expect(jorge).toMatchObject({
      document: null,
      missing: ['documentNumber'],
    });
  });

  it('books a registered patient by their account', async () => {
    let sent: unknown;
    server.events.on('request:start', ({ request }) => {
      if (request.method === 'POST')
        void request
          .clone()
          .json()
          .then((body: unknown) => {
            sent = body;
          });
    });
    const appointment = await bookAsSpecialist(user, {
      ...slot,
      specialtyId: null,
      reasonId: null,
      patient: { kind: 'registered', userId: specialistPatientIds.laura },
    });
    server.events.removeAllListeners();

    expect(sent).toEqual({
      ...slot,
      patientUserId: specialistPatientIds.laura,
    });
    expect(appointment).toMatchObject({
      patientUserId: specialistPatientIds.laura,
      officeId,
    });
  });

  it('books someone new with their data, the specialty and the reason', async () => {
    let sent: unknown;
    server.events.on('request:start', ({ request }) => {
      if (request.method === 'POST')
        void request
          .clone()
          .json()
          .then((body: unknown) => {
            sent = body;
          });
    });
    const appointment = await bookAsSpecialist(user, {
      ...slot,
      specialtyId: 'a0000000-0000-4000-8000-000000000014',
      reasonId: 'c0000000-0000-4000-8000-000000000001',
      patient: {
        kind: 'new',
        firstName: 'Pedro',
        lastName: 'Gil',
        dateOfBirth: '2020-01-10',
        document: null,
        sex: 'MALE',
        phone: '+584141234567',
      },
    });
    server.events.removeAllListeners();

    expect(sent).toEqual({
      ...slot,
      specialtyId: 'a0000000-0000-4000-8000-000000000014',
      consultationReasonId: 'c0000000-0000-4000-8000-000000000001',
      patient: {
        firstName: 'Pedro',
        lastName: 'Gil',
        dateOfBirth: '2020-01-10',
        sex: 'MALE',
        phone: '+584141234567',
      },
    });
    expect(appointment.patientUserId).toBeNull();
  });

  it('finds a booking whose answer was lost in that day’s agenda, and sends nothing again', async () => {
    let posts = 0;
    const landed = buildAppointment(
      {
        id: 'e1000000-0000-4000-8000-000000000001',
        patientUserId: specialistPatientIds.laura,
      },
      new Date('2026-10-20T13:00:00.000Z'),
    );
    server.use(
      http.post(apiUrl('/scheduling/specialist/appointments'), () => {
        posts += 1;
        return HttpResponse.error();
      }),
      http.get(apiUrl('/scheduling/specialist/appointments'), () =>
        HttpResponse.json({
          appointments: [landed],
          total: 1,
          page: 1,
          pageSize: 100,
        }),
      ),
    );

    const appointment = await bookAsSpecialist(user, {
      ...slot,
      specialtyId: null,
      reasonId: null,
      patient: { kind: 'registered', userId: specialistPatientIds.laura },
    });

    expect(appointment.id).toBe(landed.id);
    expect(posts).toBe(1);
  });
});
