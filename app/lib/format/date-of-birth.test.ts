import { describe, expect, it } from 'vitest';

import {
  birthDateProblem,
  earliestBirthDate,
  latestAdultBirthDate,
  todayInCaracas,
  yearsBefore,
} from './date-of-birth';

describe('date of birth', () => {
  it("reads today's date in Caracas, not in UTC", () => {
    // 02:00 UTC on 13 October is still the 12th in Caracas (UTC−4).
    expect(todayInCaracas(new Date('2026-10-13T02:00:00Z'))).toBe('2026-10-12');
  });

  it('counts years on the calendar', () => {
    expect(yearsBefore('2026-10-12', 18)).toBe('2008-10-12');
    expect(yearsBefore('2028-02-29', 1)).toBe('2027-02-28');
  });

  it('takes an adult, from the day they turn 18', () => {
    const today = '2026-10-12';
    expect(latestAdultBirthDate(today)).toBe('2008-10-12');
    expect(birthDateProblem('2008-10-12', today)).toBeNull();
    expect(birthDateProblem('2008-10-13', today)).toBe('tooYoung');
    expect(birthDateProblem('1990-01-15', today)).toBeNull();
  });

  it('refuses what is not a date of birth', () => {
    const today = '2026-10-12';
    expect(birthDateProblem('', today)).toBe('empty');
    expect(birthDateProblem('1990-02-30', today)).toBe('invalid');
    expect(birthDateProblem('15/01/1990', today)).toBe('invalid');
    expect(earliestBirthDate(today)).toBe('1906-10-12');
    expect(birthDateProblem('1900-01-01', today)).toBe('invalid');
  });
});
