// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { dayPartOf, freeDays } from './availability';

describe('freeDays', () => {
  it('keeps the days that are open and have a slot left', () => {
    expect(
      freeDays([
        { date: '2026-10-13', available: true, availableCount: 4 },
        { date: '2026-10-14', available: true, availableCount: 0 },
        { date: '2026-10-15', available: false, availableCount: 0 },
        { date: '2026-10-16', available: true, availableCount: null },
      ]),
    ).toEqual(new Set(['2026-10-13', '2026-10-16']));
  });
});

describe('dayPartOf', () => {
  it('splits the day as the app does', () => {
    expect(dayPartOf('08:30')).toBe('morning');
    expect(dayPartOf('11:59')).toBe('morning');
    expect(dayPartOf('12:00')).toBe('afternoon');
    expect(dayPartOf('17:59')).toBe('afternoon');
    expect(dayPartOf('18:00')).toBe('evening');
  });
});
