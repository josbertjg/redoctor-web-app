import { z } from 'zod';

/*
 * An office's free time, as the patient's endpoints answer it (the app's
 * reschedule sheet reads the same): the days of a month with their count of
 * free slots — `available: false` covers days with no hours, blocked, full
 * or past — and the slots of one day, without the booked ones or the hours
 * already gone. Days and times are the office's wall clock.
 */

export const availableDaysSchema = z.object({
  month: z.string(),
  days: z.array(
    z.object({
      date: z.string(),
      available: z.boolean(),
      availableCount: z.number().nullish(),
    }),
  ),
});

export type AvailableDays = z.infer<typeof availableDaysSchema>;

export const daySlotsSchema = z.object({
  date: z.string(),
  slots: z.array(
    z.object({
      startTime: z.string(),
      endTime: z.string().nullish(),
      available: z.boolean(),
    }),
  ),
});

export type DaySlot = z.infer<typeof daySlotsSchema>['slots'][number];

/** A day the calendar can offer: free and with at least one slot. */
export function freeDays(days: z.infer<typeof availableDaysSchema>['days']) {
  return new Set(
    days
      .filter((day) => day.available && (day.availableCount ?? 1) > 0)
      .map((day) => day.date),
  );
}

export type DayPart = 'morning' | 'afternoon' | 'evening';

/** The app's parts of the day: before 12:00, until 17:59, and from 18:00. */
export function dayPartOf(time: string): DayPart {
  // «9:00» and «09:00» alike: the hour is what comes before the colon.
  const hours = Number(/^(\d{1,2}):/.exec(time)?.[1] ?? NaN);
  if (Number.isNaN(hours)) return 'morning';
  if (hours < 12) return 'morning';
  if (hours < 18) return 'afternoon';
  return 'evening';
}
