import { z } from 'zod';

import { priceSchema, type Price } from './price';

/*
 * The specialist's own offices (`GET /specialists/offices`): to filter the
 * agenda and the statistics by office when there is more than one (M14),
 * and on «Mi perfil» with their address, their rates and their hours.
 * Created and edited in the app only.
 */

export const officeSchema = z.object({
  id: z.string(),
  name: z.string(),
  isActive: z.boolean().catch(true),
  address: z.string().nullish().catch(null),
});

export const officesResponseSchema = z.object({
  offices: z.array(officeSchema),
});

export type Office = z.infer<typeof officeSchema>;

/* ---------- Rates (`GET /specialists/offices/{id}/pricing-config`) -------- */

const reasonSchema = z.object({
  id: z.string(),
  name: z.string(),
  enabled: z.boolean().catch(false),
  price: priceSchema.nullish().catch(null),
});

export const pricingConfigSchema = z.object({
  pricingMode: z.enum(['STANDARD', 'PER_REASON']).catch('STANDARD'),
  standardPrice: priceSchema.nullish().catch(null),
  reasons: z.array(reasonSchema).catch([]),
});

export type OfficePricing = {
  /** One price for every reason, or each reason its own. */
  mode: 'standard' | 'perReason';
  /** The reasons a patient can book here, each with its price (`null`: none set). */
  reasons: { id: string; name: string; price: Price | null }[];
};

/** The office before any rate is set: nothing a patient can book there yet. */
export const noPricing: OfficePricing = { mode: 'standard', reasons: [] };

/**
 * An office's rates as the app reads them: the reasons it offers (enabled),
 * each once — when the API repeats one, the copy with a price or enabled
 * stands —, priced by the standard price or by its own.
 */
export function toOfficePricing(
  config: z.output<typeof pricingConfigSchema>,
): OfficePricing {
  const reasons = new Map<string, z.output<typeof reasonSchema>>();
  for (const reason of config.reasons) {
    const kept = reasons.get(reason.id);
    const better =
      kept === undefined ||
      (kept.price == null && reason.price != null) ||
      (!kept.enabled && reason.enabled);
    if (better) reasons.set(reason.id, reason);
  }
  const standard = config.pricingMode === 'STANDARD';
  return {
    mode: standard ? 'standard' : 'perReason',
    reasons: [...reasons.values()]
      .filter((reason) => reason.enabled)
      .map((reason) => ({
        id: reason.id,
        name: reason.name,
        price: (standard ? config.standardPrice : reason.price) ?? null,
      })),
  };
}

/* ---------- Hours (`GET /specialists/offices/{id}/schedule`) -------------- */

export const daysOfWeek = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const;

export type DayOfWeek = (typeof daysOfWeek)[number];

export const weeklyScheduleSchema = z.object({
  schedules: z
    .array(
      z.object({
        // A day this version does not know is left out, not a broken answer.
        dayOfWeek: z.enum(daysOfWeek).nullable().catch(null),
        startTime: z.string(),
        endTime: z.string(),
        slotDurationMinutes: z.number().nullish(),
      }),
    )
    .catch([]),
});

export type TimeRange = { start: string; end: string };

export type WeeklySchedule = {
  /** Consecutive days with the same hours, Monday to Sunday. */
  groups: { days: DayOfWeek[]; ranges: TimeRange[] }[];
  /** How long each appointment lasts, from the first range (the app's reading). */
  slotMinutes: number | null;
};

const rangesKey = (ranges: readonly TimeRange[]) =>
  ranges.map((range) => `${range.start}-${range.end}`).join(',');

/**
 * The week as the app's schedule card reads it: days in a row with the same
 * hours go together («Lun a Jue»), and a day without hours breaks the run.
 */
export function toWeeklySchedule(
  response: z.output<typeof weeklyScheduleSchema>,
): WeeklySchedule {
  const known = response.schedules.filter(
    (schedule) => schedule.dayOfWeek !== null,
  );
  const groups: WeeklySchedule['groups'] = [];
  let previousKey: string | null = null;

  for (const day of daysOfWeek) {
    const ranges = known
      .filter((schedule) => schedule.dayOfWeek === day)
      .map((schedule) => ({ start: schedule.startTime, end: schedule.endTime }))
      .sort((a, b) => a.start.localeCompare(b.start));
    if (ranges.length === 0) {
      previousKey = null;
      continue;
    }
    const key = rangesKey(ranges);
    const last = groups[groups.length - 1];
    if (last !== undefined && key === previousKey) last.days.push(day);
    else groups.push({ days: [day], ranges });
    previousKey = key;
  }

  return { groups, slotMinutes: known[0]?.slotDurationMinutes ?? null };
}
