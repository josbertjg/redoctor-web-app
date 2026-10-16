// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { relativeTime } from './time';

const now = Date.UTC(2026, 9, 14, 20, 0, 0);
const ago = (ms: number) => new Date(now - ms).toISOString();
const minute = 60_000;
const hour = 60 * minute;
const day = 24 * hour;

describe('relativeTime', () => {
  it('says now under a minute, and for an instant still to come', () => {
    expect(relativeTime(ago(30_000), now)).toEqual({ kind: 'now' });
    expect(relativeTime(ago(-5 * minute), now)).toEqual({ kind: 'now' });
  });

  it('counts minutes under an hour and hours under a day', () => {
    expect(relativeTime(ago(5 * minute), now)).toEqual({
      kind: 'minutes',
      count: 5,
    });
    expect(relativeTime(ago(59 * minute + 59_000), now)).toEqual({
      kind: 'minutes',
      count: 59,
    });
    expect(relativeTime(ago(3 * hour + 20 * minute), now)).toEqual({
      kind: 'hours',
      count: 3,
    });
  });

  it('says yesterday for one day, counts days under a week, then gives the date', () => {
    expect(relativeTime(ago(26 * hour), now)).toEqual({ kind: 'yesterday' });
    expect(relativeTime(ago(3 * day), now)).toEqual({ kind: 'days', count: 3 });
    expect(relativeTime(ago(8 * day), now)).toEqual({
      kind: 'date',
      instant: ago(8 * day),
    });
  });

  it('has nothing to say without an instant, or with one that is not a date', () => {
    expect(relativeTime(null, now)).toBeNull();
    expect(relativeTime('yesterday-ish', now)).toBeNull();
  });
});
