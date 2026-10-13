// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  calendarDaysUntil,
  formatCalendarDate,
  formatDate,
  formatDateTime,
  formatPeriod,
  formatTime,
} from './dates';

describe('dates in Caracas', () => {
  it('writes an instant as a day, as the emails do', () => {
    // 03:59 UTC is still the night before in Caracas (UTC−4).
    expect(formatDate('2026-11-12T03:59:59.999Z')).toBe(
      '11 de noviembre de 2026',
    );
    expect(formatDate('not a date')).toBeNull();
  });

  it('adds the hour where it counts, never broken across lines', () => {
    expect(formatTime('2026-10-12T19:30:00Z')).toBe('3:30\u00a0p.\u00a0m.');
    expect(formatDateTime('2026-10-12T19:30:00Z')).toBe(
      '12 de octubre de 2026, 3:30\u00a0p.\u00a0m.',
    );
  });

  it('writes a period short, the year at the end', () => {
    expect(
      formatPeriod('2026-10-12T04:00:00.000Z', '2026-11-12T03:59:59.999Z'),
    ).toBe('12 oct. – 11 nov. 2026');
    expect(formatPeriod(null, '2026-11-12T03:59:59.999Z')).toBeNull();
  });

  it('never shifts a calendar date through a time zone', () => {
    expect(formatCalendarDate('2026-10-12')).toBe('12 de octubre de 2026');
    expect(formatCalendarDate('hoy')).toBe('hoy');
  });

  it('counts calendar days to a deadline, never negative', () => {
    const now = new Date('2026-10-12T12:00:00Z');
    // 23:00 in Caracas the same day.
    expect(calendarDaysUntil('2026-10-13T03:00:00Z', now)).toBe(0);
    // 01:00 in Caracas the next day.
    expect(calendarDaysUntil('2026-10-13T05:00:00Z', now)).toBe(1);
    expect(calendarDaysUntil('2026-10-17T12:00:00Z', now)).toBe(5);
    expect(calendarDaysUntil('2026-10-01T12:00:00Z', now)).toBe(0);
    expect(calendarDaysUntil('never', now)).toBe(0);
  });
});
