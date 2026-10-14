import { describe, expect, it } from 'vitest';

import { formatDistance } from './distance';

describe('formatDistance', () => {
  it('writes metres under a kilometre', () => {
    expect(formatDistance(850.4)).toBe('850 m');
  });

  it('writes kilometres with one decimal, the locale’s comma', () => {
    expect(formatDistance(3200)).toBe('3,2 km');
    expect(formatDistance(12_000)).toBe('12 km');
  });

  it('drops the decimal past a hundred kilometres', () => {
    expect(formatDistance(123_456)).toBe('123 km');
  });

  it('writes nothing for a distance that is not one', () => {
    expect(formatDistance(-1)).toBe('');
    expect(formatDistance(Number.NaN)).toBe('');
  });
});
