// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  formatBucket,
  formatDayRange,
  formatExactMoney,
  formatFigure,
  formatHeadlineFigure,
  formatHeadlineMoney,
  formatHour,
  formatPercent,
  formatRating,
  formatWeekday,
} from './figures';

const nbsp = '\u00a0';

describe('the statistics’ figures', () => {
  it('writes whole figures with the locale’s thousands', () => {
    expect(formatFigure(1240)).toBe('1.240');
    expect(formatFigure(12.6)).toBe('13');
  });

  it('keeps a card’s figure whole up to 9.999 and compact beyond', () => {
    expect(formatHeadlineFigure(9999)).toBe('9.999');
    expect(formatHeadlineFigure(12_900)).toMatch(/^12,9\smil$/);
  });

  it('writes a rating with one decimal and a share as a whole percent', () => {
    expect(formatRating(4.6)).toBe('4,6');
    expect(formatRating(5)).toBe('5,0');
    expect(formatPercent(0.47)).toMatch(/^47\s?%$/);
  });

  it('writes money with its sign: whole on a card, exact in a table', () => {
    expect(formatHeadlineMoney(4350.75, 'USD')).toBe('$ 4.351');
    expect(formatExactMoney(49.99, 'USD')).toBe('$ 49,99');
    expect(formatExactMoney(1150, 'USD')).toBe('$ 1.150');
    expect(formatExactMoney(80, 'EUR')).toBe('€ 80');
  });
});

describe('the words of a period', () => {
  it('writes a range of days, one year said once', () => {
    expect(formatDayRange('2026-10-01', '2026-10-14')).toMatch(
      /^1 – 14 oct\.? 2026$/,
    );
    expect(formatDayRange('2026-09-28', '2026-10-14')).toMatch(
      /^28 sept?\.? – 14 oct\.? 2026$/,
    );
    expect(formatDayRange('2025-12-15', '2026-01-13')).toMatch(
      /^15 dic\.? 2025 – 13 ene\.? 2026$/,
    );
  });

  it('names a bucket, a weekday and an hour', () => {
    expect(formatBucket('2026-10-13')).toMatch(/^13 oct\.?$/);
    expect(formatBucket('2026-10')).toMatch(/^oct\.? 2026$/);
    expect(formatWeekday(1)).toBe('lunes');
    expect(formatWeekday(7)).toBe('domingo');
    expect(formatHour(15)).toBe(`3:00${nbsp}p.${nbsp}m.`);
  });
});
