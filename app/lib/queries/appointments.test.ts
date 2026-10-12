import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import {
  appointmentIds,
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
} from './appointments';
import { validToken } from '../../../tests/msw/handlers/identity';

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
