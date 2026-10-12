import { describe, expect, it } from 'vitest';

import {
  formatAppointmentDay,
  formatAppointmentTime,
  formatInstant,
} from './appointment-time';

// Intl separates «p. m.» with narrow no-break spaces; compare the words.
const plain = (text: string | undefined) => text?.replace(/[  ]/g, ' ');

describe('formatAppointmentDay', () => {
  it('writes the day as the emails do, never shifted', () => {
    expect(formatAppointmentDay('2026-10-01')).toBe(
      'jueves 1 de octubre de 2026',
    );
    expect(formatAppointmentDay('2026-12-31')).toBe(
      'jueves 31 de diciembre de 2026',
    );
  });

  it('leaves what is not a date alone', () => {
    expect(formatAppointmentDay('mañana')).toBe('mañana');
  });
});

describe('formatAppointmentTime', () => {
  it('writes the office wall clock with «a. m.» and «p. m.»', () => {
    expect(plain(formatAppointmentTime('15:00'))).toBe('3:00 p. m.');
    expect(plain(formatAppointmentTime('08:30'))).toBe('8:30 a. m.');
  });
});

describe('formatInstant', () => {
  it('shows an instant in Caracas', () => {
    const shown = formatInstant('2026-09-30T19:00:00.000Z');
    expect(shown?.day).toBe('miércoles 30 de septiembre de 2026');
    expect(plain(shown?.time)).toBe('3:00 p. m.');
  });

  it('answers null for something that is not an instant', () => {
    expect(formatInstant('soon')).toBeNull();
  });
});

describe('calendar headings', () => {
  it('names a month and the weekdays from Monday', async () => {
    const { formatMonth, weekdayInitials } = await import('./appointment-time');
    expect(formatMonth('2026-10')).toBe('octubre de 2026');
    expect(weekdayInitials()).toEqual(['L', 'M', 'M', 'J', 'V', 'S', 'D']);
  });
});
