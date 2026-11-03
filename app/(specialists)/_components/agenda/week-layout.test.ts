import { describe, expect, it } from 'vitest';

import {
  appointmentSchema,
  toAppointmentSummary,
} from '@/app/lib/schemas/appointments';

import { buildAppointment } from '@/tests/factories/appointments';

import { weekLayout } from './week-layout';

const week = [
  '2026-10-12',
  '2026-10-13',
  '2026-10-14',
  '2026-10-15',
  '2026-10-16',
  '2026-10-17',
  '2026-10-18',
];

/** An appointment at a Caracas wall time (UTC−4), `minutes` long. */
const at = (id: string, date: string, time: string, minutes = 30) => {
  const [hour = 0, minute = 0] = time.split(':').map(Number);
  const start = new Date(`${date}T00:00:00.000Z`);
  start.setUTCHours(hour + 4, minute);
  const appointment = buildAppointment({ id }, start);
  return toAppointmentSummary(
    appointmentSchema.parse({
      ...appointment,
      slot: {
        ...appointment.slot,
        endTime: new Date(start.getTime() + (minutes - 240) * 60_000)
          .toISOString()
          .slice(11, 16),
        endsAtUtc: new Date(start.getTime() + minutes * 60_000).toISOString(),
        slotDurationMinutes: minutes,
      },
    }),
  );
};

describe('weekLayout', () => {
  it('spans the working day at least, and nothing more without appointments', () => {
    expect(weekLayout([], week)).toEqual({
      hours: { from: 8, to: 18 },
      blocks: [],
    });
  });

  it('grows to the earliest and the latest appointment of the week', () => {
    const { hours } = weekLayout(
      [at('a', '2026-10-12', '07:30'), at('b', '2026-10-16', '18:30', 60)],
      week,
    );
    expect(hours).toEqual({ from: 7, to: 20 });
  });

  it('places each one by its start and length, in its day', () => {
    const { blocks } = weekLayout([at('a', '2026-10-13', '09:15', 45)], week);
    expect(blocks).toEqual([
      expect.objectContaining({
        day: '2026-10-13',
        top: 75,
        height: 45,
        column: 0,
        columns: 1,
      }),
    ]);
  });

  it('puts the ones that overlap side by side, never on top of each other', () => {
    const { blocks } = weekLayout(
      [
        at('a', '2026-10-14', '09:00', 60),
        at('b', '2026-10-14', '09:30', 60),
        at('c', '2026-10-14', '10:00', 60),
        at('d', '2026-10-14', '12:00'),
      ],
      week,
    );
    const place = (id: string) => {
      const block = blocks.find((candidate) => candidate.appointment.id === id);
      return block && [block.column, block.columns];
    };
    expect(place('a')).toEqual([0, 2]);
    expect(place('b')).toEqual([1, 2]);
    // «a» is over when «c» starts: its column is free again.
    expect(place('c')).toEqual([0, 2]);
    expect(place('d')).toEqual([0, 1]);
  });

  it('leaves out what falls outside the week', () => {
    expect(weekLayout([at('a', '2026-10-19', '09:00')], week).blocks).toEqual(
      [],
    );
  });
});
