// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  addDays,
  customRangeProblem,
  granularityFor,
  isCalendarDay,
  presetRange,
  rangeDays,
} from './period';

// Wednesday 14 October 2026.
const today = '2026-10-14';

describe('presetRange', () => {
  it('counts each preset back from today, today included', () => {
    expect(presetRange('thisWeek', today)).toEqual({
      from: '2026-10-12',
      to: today,
    });
    expect(presetRange('thisMonth', today)).toEqual({
      from: '2026-10-01',
      to: today,
    });
    expect(presetRange('last30Days', today)).toEqual({
      from: '2026-09-15',
      to: today,
    });
    expect(presetRange('last3Months', today)).toEqual({
      from: '2026-07-15',
      to: today,
    });
    expect(presetRange('thisYear', today)).toEqual({
      from: '2026-01-01',
      to: today,
    });
  });

  it('starts the week on Monday, a Sunday included', () => {
    expect(presetRange('thisWeek', '2026-10-18').from).toBe('2026-10-12');
    expect(presetRange('thisWeek', '2026-10-12').from).toBe('2026-10-12');
  });

  it('looks three months back from the 31st at the month’s last day', () => {
    // The day after 28 February, as the app counts it.
    expect(presetRange('last3Months', '2026-05-31').from).toBe('2026-03-01');
  });
});

describe('granularityFor', () => {
  it('buckets by days up to a month, by weeks up to half a year, by months beyond', () => {
    expect(granularityFor({ from: '2026-10-01', to: '2026-10-31' })).toBe(
      'day',
    );
    expect(granularityFor({ from: '2026-09-15', to: '2026-10-31' })).toBe(
      'week',
    );
    expect(granularityFor({ from: '2026-01-01', to: '2026-10-14' })).toBe(
      'month',
    );
  });
});

describe('customRangeProblem', () => {
  it('takes two days in order, up to today', () => {
    expect(
      customRangeProblem({ from: '2026-10-01', to: today }, today),
    ).toBeNull();
  });

  it('says what is wrong with the two days', () => {
    expect(customRangeProblem({ from: '', to: today }, today)).toBe('invalid');
    expect(customRangeProblem({ from: '2026-02-30', to: today }, today)).toBe(
      'invalid',
    );
    expect(
      customRangeProblem({ from: '2026-10-10', to: '2026-10-01' }, today),
    ).toBe('order');
    expect(
      customRangeProblem({ from: '2026-10-10', to: '2026-10-15' }, today),
    ).toBe('future');
    expect(customRangeProblem({ from: '2025-10-01', to: today }, today)).toBe(
      'tooLong',
    );
    expect(
      customRangeProblem({ from: '2021-10-01', to: '2021-10-10' }, today),
    ).toBe('tooOld');
  });
});

describe('calendar days', () => {
  it('reads real days only and steps across months', () => {
    expect(isCalendarDay('2026-10-14')).toBe(true);
    expect(isCalendarDay('2026-02-29')).toBe(false);
    expect(isCalendarDay('mañana')).toBe(false);
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(rangeDays({ from: '2026-10-01', to: '2026-10-14' })).toBe(14);
  });
});
