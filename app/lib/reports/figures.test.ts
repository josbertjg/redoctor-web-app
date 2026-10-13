// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { buildSpecialistReport } from '@/tests/factories/agenda';

import {
  averageTrend,
  busiestSlots,
  completedTrend,
  mainCurrency,
  outcomeOf,
  reasonsByCompleted,
  reasonsByDemand,
  trendOf,
} from './figures';
import { specialistReportSchema } from '../schemas/reports';

const report = specialistReportSchema.parse(buildSpecialistReport());
if (
  !report.appointments ||
  !report.income ||
  !report.reviews ||
  !report.reasons
) {
  throw new Error('The factory brings the four sections');
}
const { appointments, income, reviews, reasons } = report;
const [usd] = income.currencies;
if (!usd) throw new Error('The factory brings an income in dollars');

describe('trendOf', () => {
  it('says how a figure moved and by how much', () => {
    expect(trendOf(6, 5)).toEqual({ direction: 'up', change: 0.2 });
    expect(trendOf(4, 8)).toEqual({ direction: 'down', change: -0.5 });
    expect(trendOf(3, 3)).toEqual({ direction: 'flat', change: 0 });
  });

  it('measures no change against nothing', () => {
    expect(trendOf(4, 0)).toEqual({ direction: 'up', change: null });
  });
});

describe('the readings of a report', () => {
  it('tells how the appointments ended, the open ones apart', () => {
    expect(outcomeOf(appointments)).toEqual({
      total: 12,
      completed: 6,
      cancelled: 2,
      noShow: 1,
      open: 3,
    });
    expect(completedTrend(appointments).direction).toBe('up');
  });

  it('sums the income up in the currency with the most appointments', () => {
    expect(mainCurrency(income)?.currency).toBe('USD');
    expect(
      mainCurrency({
        unpriced: 0,
        currencies: [
          { ...usd, currency: 'EUR', appointments: 1 },
          { ...usd, currency: 'VES', appointments: 4 },
        ],
      })?.currency,
    ).toBe('VES');
    expect(mainCurrency({ unpriced: 2, currencies: [] })).toBeNull();
  });

  it('compares the rating only when both periods have one', () => {
    expect(averageTrend(reviews)?.direction).toBe('up');
    expect(
      averageTrend({ ...reviews, previous: { average: null, count: 0 } }),
    ).toBeNull();
  });

  it('orders the busiest slots, the earlier in the week first on a tie', () => {
    const slots = busiestSlots({
      ...appointments,
      byWeekdayHour: [
        { weekday: 4, hour: 15, total: 2 },
        { weekday: 2, hour: 9, total: 2 },
        { weekday: 1, hour: 10, total: 5 },
        { weekday: 3, hour: 8, total: 0 },
      ],
    });
    expect(slots.map((slot) => [slot.weekday, slot.hour])).toEqual([
      [1, 10],
      [2, 9],
      [4, 15],
    ]);
  });

  it('ranks the reasons by demand and by attended', () => {
    expect(reasonsByDemand(reasons).map((reason) => reason.reasonId)).toEqual([
      'r1',
      'r2',
    ]);
    expect(
      reasonsByCompleted({
        ...reasons,
        items: [
          {
            reasonId: 'a',
            reasonName: 'A',
            total: 9,
            completed: 1,
            share: 0.5,
          },
          {
            reasonId: 'b',
            reasonName: 'B',
            total: 3,
            completed: 3,
            share: 0.2,
          },
        ],
      }).map((reason) => reason.reasonId),
    ).toEqual(['b', 'a']);
  });
});
