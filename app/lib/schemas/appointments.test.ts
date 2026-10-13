import { describe, expect, it } from 'vitest';

import {
  appointmentFor,
  appointmentIds,
  buildAppointment,
  hoursFromNow,
} from '@/tests/factories/appointments';

import {
  appointmentActions,
  appointmentSchema,
  groupAppointments,
  isAppointmentAhead,
  statusChips,
  toAppointmentSummary,
} from './appointments';

const now = new Date('2026-10-12T15:00:00.000Z');

const summary = (input: unknown) =>
  toAppointmentSummary(appointmentSchema.parse(input));

describe('toAppointmentSummary', () => {
  it('keeps who, when, where, and the instants it starts and ends', () => {
    const appointment = summary(buildAppointment({}, hoursFromNow(72, now)));

    expect(appointment.specialist.name).toBe('Dra. María González');
    expect(appointment.office.id).toBe('b1b2b3b4-0000-4000-8000-000000000001');
    expect(appointment.startsAt).toBe('2026-10-15T15:00:00.000Z');
    expect(appointment.endsAt).toBe('2026-10-15T15:30:00.000Z');
    expect(appointment.date).toBe('2026-10-15');
    expect(appointment.startTime).toBe('11:00');
    expect(appointment.forDependent).toBe(false);
  });

  it('tells someone in one’s care apart, with what the app shows of them', () => {
    const appointment = summary(
      buildAppointment({
        forSelf: false,
        attendee: {
          firstName: 'Sofía',
          lastName: 'Pérez',
          dateOfBirth: '2019-03-01',
          sex: 'FEMALE',
          documentType: null,
          documentNumber: null,
        },
      }),
    );

    expect(appointment.forDependent).toBe(true);
    expect(appointment.attendee).toEqual({
      firstName: 'Sofía',
      lastName: 'Pérez',
      dateOfBirth: '2019-03-01',
      sex: 'FEMALE',
      document: null,
    });
  });

  it('keeps the cancellation and every reschedule', () => {
    const cancelled = summary(appointmentFor(appointmentIds.cancelled, now));
    expect(cancelled.cancellation).toEqual({
      by: 'SPECIALIST',
      reason: 'Tuve una emergencia en el hospital.',
      at: now.toISOString(),
    });

    const moved = summary(
      buildAppointment({
        isRescheduled: true,
        rescheduleHistory: [
          {
            by: 'SPECIALIST',
            from: { date: '2026-10-20', startTime: '09:00' },
            to: { date: '2026-10-21', startTime: '10:30' },
          },
        ],
      }),
    );
    expect(moved.rescheduled).toBe(true);
    expect(moved.rescheduleHistory).toEqual([
      {
        by: 'SPECIALIST',
        from: { date: '2026-10-20', startTime: '09:00' },
        to: { date: '2026-10-21', startTime: '10:30' },
      },
    ]);
  });
});

describe('appointmentActions', () => {
  const at = (id: string) => summary(appointmentFor(id, now));

  it('says when the confirmation opens, and lets the patient change it', () => {
    expect(appointmentActions(at(appointmentIds.upcoming), now)).toEqual({
      confirm: { kind: 'later', opensAt: '2026-10-14T15:00:00.000Z' },
      change: true,
      calendar: true,
    });
  });

  it('confirms once the window is open', () => {
    expect(
      appointmentActions(at(appointmentIds.confirmable), now).confirm,
    ).toEqual({ kind: 'now' });
  });

  it('asks nothing more of a confirmed one, but it can still change', () => {
    expect(appointmentActions(at(appointmentIds.confirmed), now)).toEqual({
      confirm: null,
      change: true,
      calendar: true,
    });
  });

  it('changes nothing once it has started, nor when it is over (REDOC-308)', () => {
    const nothing = { confirm: null, change: false, calendar: false };
    expect(appointmentActions(at(appointmentIds.started), now)).toEqual(
      nothing,
    );
    expect(appointmentActions(at(appointmentIds.cancelled), now)).toEqual(
      nothing,
    );
    expect(appointmentActions(at(appointmentIds.completed), now)).toEqual(
      nothing,
    );
  });

  it('offers no confirmation for a move the specialist made, as in the app', () => {
    const proposed = summary(
      buildAppointment(
        { status: 'RESCHEDULE_PROPOSED', canConfirmNow: true },
        hoursFromNow(20, now),
      ),
    );
    expect(appointmentActions(proposed, now)).toEqual({
      confirm: null,
      change: true,
      calendar: true,
    });
  });
});

describe('groupAppointments', () => {
  const at = (id: string) => summary(appointmentFor(id, now));

  it('splits what is to come from what is over, each in its order', () => {
    const groups = groupAppointments(
      [
        appointmentIds.completed,
        appointmentIds.upcoming,
        appointmentIds.cancelled,
        appointmentIds.confirmable,
        appointmentIds.started,
      ].map(at),
      now,
    );

    // The soonest first, the one under way included.
    expect(groups.upcoming.map((appointment) => appointment.id)).toEqual([
      appointmentIds.started,
      appointmentIds.confirmable,
      appointmentIds.upcoming,
    ]);
    // The latest first: the cancelled one is in two days, over by its status.
    expect(groups.past.map((appointment) => appointment.id)).toEqual([
      appointmentIds.cancelled,
      appointmentIds.completed,
    ]);
  });

  it('keeps one under way among the ones to come, until it ends', () => {
    expect(isAppointmentAhead(at(appointmentIds.started), now)).toBe(true);

    const ended = summary(
      buildAppointment(
        { status: 'CONFIRMED' },
        new Date(now.getTime() - 40 * 60_000),
      ),
    );
    expect(isAppointmentAhead(ended, now)).toBe(false);
  });
});

describe('statusChips', () => {
  it('names each status as the app does, with its tone', () => {
    expect(statusChips.PENDING_CONFIRMATION).toEqual({
      label: 'pending',
      tone: 'warning',
    });
    expect(statusChips.CONFIRMED.tone).toBe('positive');
    expect(statusChips.RESCHEDULE_PROPOSED.label).toBe('rescheduled');
    expect(statusChips.CANCELLED.tone).toBe('error');
    expect(statusChips.COMPLETED.label).toBe('finished');
    expect(statusChips.NO_SHOW.label).toBe('noShow');
  });
});
