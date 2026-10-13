import type {
  pricingConfigSchema,
  weeklyScheduleSchema,
} from '@/app/lib/schemas/offices';

import { officeId } from './appointments';

import type { z } from 'zod';

/*
 * An office's rates and hours, shaped like the API's answers to
 * `GET /specialists/offices/{id}/pricing-config` and `/schedule` (dev,
 * 2026-10-13), with made-up reasons and hours.
 */

type PricingConfigInput = z.input<typeof pricingConfigSchema>;
type ScheduleInput = z.input<typeof weeklyScheduleSchema>['schedules'][number];

/** One price for every reason: two offered, one switched off. */
export function buildPricingConfig(
  overrides: Partial<PricingConfigInput> = {},
): PricingConfigInput {
  return {
    pricingMode: 'STANDARD',
    standardPrice: {
      type: 'FIXED',
      currency: 'USD',
      amount: 40,
      minAmount: null,
      maxAmount: null,
    },
    reasons: [
      {
        id: 'reason-general',
        name: 'Consulta general',
        enabled: true,
        price: null,
      },
      { id: 'reason-control', name: 'Control', enabled: true, price: null },
      {
        id: 'reason-ekg',
        name: 'Electrocardiograma',
        enabled: false,
        price: null,
      },
    ],
    ...overrides,
  };
}

/** One range of hours on a day, 30 minutes an appointment. */
export const scheduleHours = (
  dayOfWeek: ScheduleInput['dayOfWeek'],
  startTime: string,
  endTime: string,
): ScheduleInput => ({
  dayOfWeek,
  startTime,
  endTime,
  slotDurationMinutes: 30,
});

/** Mornings from Monday to Thursday; Friday, morning and afternoon. */
export function buildWeeklySchedule(
  schedules: ScheduleInput[] = [
    scheduleHours('MONDAY', '08:00', '12:00'),
    scheduleHours('TUESDAY', '08:00', '12:00'),
    scheduleHours('WEDNESDAY', '08:00', '12:00'),
    scheduleHours('THURSDAY', '08:00', '12:00'),
    scheduleHours('FRIDAY', '14:00', '18:00'),
    scheduleHours('FRIDAY', '08:00', '12:00'),
  ],
) {
  return {
    schedules: schedules.map((schedule, index) => ({
      id: `schedule-${String(index)}`,
      officeId,
      ...schedule,
    })),
  };
}
