import { z } from 'zod';

/*
 * `GET /reports/specialist` (M14), the numbers behind the specialist's
 * statistics, as the app reads them (its `SpecialistReportResponse`): the
 * appointments, the income estimated from the specialist's own prices, the
 * reviews and the reasons for consulting, each with the period of the same
 * length right before. Read leniently: a figure the API leaves out counts
 * as zero, a list as empty, so one missing number never hides the rest.
 * Viewing is never plan-gated; `canExport` only says whether the plan lets
 * the specialist download them.
 */

const count = z.number().int().nonnegative().catch(0);
const amount = z.number().catch(0);
const average = z.number().nullable().catch(null);
const name = z.string().nullable().catch(null);

export const reportGranularities = ['day', 'week', 'month'] as const;

const statusCounts = z
  .object({
    PENDING_CONFIRMATION: count,
    CONFIRMED: count,
    RESCHEDULE_PROPOSED: count,
    CANCELLED: count,
    COMPLETED: count,
    NO_SHOW: count,
  })
  .catch({
    PENDING_CONFIRMATION: 0,
    CONFIRMED: 0,
    RESCHEDULE_PROPOSED: 0,
    CANCELLED: 0,
    COMPLETED: 0,
    NO_SHOW: 0,
  });

const appointmentsSectionSchema = z.object({
  total: count,
  byStatus: statusCounts,
  cancelledBy: z
    .object({ PATIENT: count, SPECIALIST: count, SYSTEM: count })
    .catch({ PATIENT: 0, SPECIALIST: 0, SYSTEM: 0 }),
  /** Booked for people without an account yet. */
  unclaimed: count,
  newPatients: count,
  returningPatients: count,
  series: z
    .array(
      z.object({
        bucket: z.string(),
        total: count,
        completed: count,
        cancelled: count,
        noShow: count,
      }),
    )
    .catch([]),
  /** Monday is 1. */
  byWeekdayHour: z
    .array(
      z.object({
        weekday: z.number().int(),
        hour: z.number().int(),
        total: count,
      }),
    )
    .catch([]),
  byOffice: z
    .array(z.object({ officeId: z.string(), officeName: name, total: count }))
    .catch([]),
  previous: z
    .object({ total: count, completed: count, cancelled: count, noShow: count })
    .catch({ total: 0, completed: 0, cancelled: 0, noShow: 0 }),
});

const incomeCurrencySchema = z.object({
  /** USD, EUR or VES; never converted, never added together. */
  currency: z.string(),
  /** In the currency's units, as the prices are: `35` is $ 35. */
  total: amount,
  appointments: count,
  series: z.array(z.object({ bucket: z.string(), total: amount })).catch([]),
  byReason: z
    .array(
      z.object({
        reasonId: name,
        reasonName: name,
        total: amount,
        appointments: count,
      }),
    )
    .catch([]),
  byOffice: z
    .array(
      z.object({
        officeId: name,
        officeName: name,
        total: amount,
        appointments: count,
      }),
    )
    .catch([]),
  previous: z
    .object({ total: amount, appointments: count })
    .catch({ total: 0, appointments: 0 }),
});

const incomeSectionSchema = z.object({
  /** Completed appointments without a price: they add nothing. */
  unpriced: count,
  currencies: z.array(incomeCurrencySchema).catch([]),
});

const averageAndCount = z
  .object({ average, count })
  .catch({ average: null, count: 0 });

const reviewsSectionSchema = z.object({
  average,
  count,
  withComment: count,
  distribution: z
    .object({ '1': count, '2': count, '3': count, '4': count, '5': count })
    .catch({ '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }),
  series: z.array(z.object({ bucket: z.string(), average, count })).catch([]),
  allTime: averageAndCount,
  previous: averageAndCount,
});

const reasonsSectionSchema = z.object({
  total: count,
  withoutReason: count,
  items: z
    .array(
      z.object({
        reasonId: z.string(),
        reasonName: name,
        total: count,
        completed: count,
        /** Of the period's appointments with a reason, 0 to 1. */
        share: z.number().catch(0),
      }),
    )
    .catch([]),
});

export const specialistReportSchema = z.object({
  range: z.object({
    from: z.string(),
    to: z.string(),
    granularity: z.enum(reportGranularities).catch('day'),
  }),
  canExport: z.boolean().catch(false),
  appointments: appointmentsSectionSchema.nullish(),
  income: incomeSectionSchema.nullish(),
  reviews: reviewsSectionSchema.nullish(),
  reasons: reasonsSectionSchema.nullish(),
});

export type SpecialistReport = z.infer<typeof specialistReportSchema>;
export type AppointmentsSection = z.infer<typeof appointmentsSectionSchema>;
export type IncomeSection = z.infer<typeof incomeSectionSchema>;
export type IncomeCurrency = z.infer<typeof incomeCurrencySchema>;
export type ReviewsSection = z.infer<typeof reviewsSectionSchema>;
export type ReasonsSection = z.infer<typeof reasonsSectionSchema>;
