// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  buildPricingConfig,
  buildWeeklySchedule,
  scheduleHours,
} from '@/tests/factories/offices';

import {
  pricingConfigSchema,
  toOfficePricing,
  toWeeklySchedule,
  weeklyScheduleSchema,
} from './offices';

const pricingOf = (config: unknown) =>
  toOfficePricing(pricingConfigSchema.parse(config));

const weekOf = (response: unknown) =>
  toWeeklySchedule(weeklyScheduleSchema.parse(response));

const fixed = (amount: number) => ({
  type: 'FIXED' as const,
  currency: 'USD',
  amount,
  minAmount: null,
  maxAmount: null,
});

describe('toOfficePricing', () => {
  it('prices every reason on offer with the standard price', () => {
    const pricing = pricingOf(buildPricingConfig());

    expect(pricing.mode).toBe('standard');
    expect(pricing.reasons.map((reason) => reason.name)).toEqual([
      'Consulta general',
      'Control',
    ]);
    expect(pricing.reasons.map((reason) => reason.price?.amount)).toEqual([
      40, 40,
    ]);
  });

  it('gives each reason its own price, or none, when prices go by reason', () => {
    const pricing = pricingOf(
      buildPricingConfig({
        pricingMode: 'PER_REASON',
        reasons: [
          { id: 'a', name: 'Consulta', enabled: true, price: fixed(25) },
          { id: 'b', name: 'Control', enabled: true, price: null },
        ],
      }),
    );

    expect(pricing.mode).toBe('perReason');
    expect(
      pricing.reasons.map((reason) => reason.price?.amount ?? null),
    ).toEqual([25, null]);
  });

  it('keeps a reason the API repeats once: the copy priced and switched on', () => {
    const pricing = pricingOf(
      buildPricingConfig({
        pricingMode: 'PER_REASON',
        reasons: [
          { id: 'a', name: 'Consulta', enabled: false, price: null },
          { id: 'a', name: 'Consulta', enabled: true, price: fixed(30) },
        ],
      }),
    );

    expect(pricing.reasons).toHaveLength(1);
    expect(pricing.reasons[0]?.price?.amount).toBe(30);
  });
});

describe('toWeeklySchedule', () => {
  it('puts together the days in a row that share their hours', () => {
    const week = weekOf(buildWeeklySchedule());

    expect(week.groups).toEqual([
      {
        days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY'],
        ranges: [{ start: '08:00', end: '12:00' }],
      },
      {
        days: ['FRIDAY'],
        ranges: [
          { start: '08:00', end: '12:00' },
          { start: '14:00', end: '18:00' },
        ],
      },
    ]);
    expect(week.slotMinutes).toBe(30);
  });

  it('breaks a run on a day without hours', () => {
    const week = weekOf(
      buildWeeklySchedule([
        scheduleHours('MONDAY', '08:00', '12:00'),
        scheduleHours('WEDNESDAY', '08:00', '12:00'),
      ]),
    );

    expect(week.groups.map((group) => group.days)).toEqual([
      ['MONDAY'],
      ['WEDNESDAY'],
    ]);
  });

  it('leaves out a day this version does not know', () => {
    const week = weekOf({
      schedules: [
        {
          dayOfWeek: 'HOLIDAY',
          startTime: '08:00',
          endTime: '12:00',
          slotDurationMinutes: 30,
        },
      ],
    });

    expect(week).toEqual({ groups: [], slotMinutes: null });
  });
});
