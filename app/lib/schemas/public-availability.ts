import { z } from 'zod';

/*
 * The public agenda: what anyone may see of a specialist's free time, with
 * no session — the search's own endpoints (AGENTS.md §5) —, what the public
 * profile's booking offers before anyone signs in.
 *
 * `GET /search/specialists/{id}/availability?fromDate=`: each office's next
 * twelve days with hours from that day (days without hours or blocked are
 * left out; a full one comes `available: false`, though today the API
 * counts every day with hours as free: its own TODO). The hours of a day
 * come from `GET /search/offices/{id}/slots?date=`, the same answer as the
 * patient's endpoint (`daySlotsSchema`): every hour, the booked and the past
 * ones `available: false`.
 */
export const specialistAvailabilityResponseSchema = z.object({
  offices: z.array(
    z.object({
      officeId: z.string(),
      nextAvailableDays: z.array(
        z.object({ date: z.string(), available: z.boolean() }),
      ),
    }),
  ),
});

export type SpecialistAvailabilityResponse = z.output<
  typeof specialistAvailabilityResponseSchema
>;

/** How many days with free hours one answer covers, per office (the API's window). */
export const availabilityWindow = 12;

/** Each office's free days, in order. */
export type OfficeFreeDays = Partial<Record<string, string[]>>;

export function toOfficeFreeDays(
  response: SpecialistAvailabilityResponse,
): OfficeFreeDays {
  const days: OfficeFreeDays = {};
  for (const office of response.offices) {
    days[office.officeId] = office.nextAvailableDays
      .filter((day) => day.available)
      .map((day) => day.date)
      .sort();
  }
  return days;
}

/**
 * Where the next answer must start for a month to be covered, or null when
 * this one covered it: past the last day of an office whose window ended
 * inside the month (it may have more after), the earliest of them.
 */
export function nextWindowStart(
  response: SpecialistAvailabilityResponse,
  monthEnd: string,
): string | null {
  let earliest: string | null = null;
  for (const office of response.offices) {
    const open = office.nextAvailableDays.filter((day) => day.available);
    const last = office.nextAvailableDays.at(-1)?.date;
    if (open.length < availabilityWindow || last === undefined) continue;
    if (last >= monthEnd) continue;
    if (earliest === null || last < earliest) earliest = last;
  }
  return earliest === null ? null : dayAfter(earliest);
}

export function dayAfter(date: string): string {
  const next = new Date(`${date}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

/** The last calendar day of a month (`YYYY-MM`). */
export function lastDayOf(month: string): string {
  const [year, number] = month.split('-').map(Number);
  const length = new Date(Date.UTC(year ?? 0, number ?? 1, 0)).getUTCDate();
  return `${month}-${String(length).padStart(2, '0')}`;
}
