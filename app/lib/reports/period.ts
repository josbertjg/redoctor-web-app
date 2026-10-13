/*
 * The period of the specialist's statistics (M14), as the app chooses it
 * (`ReportPeriod`, `ReportGranularity`): a preset counted from today in
 * Caracas, or two days the person picks. Every preset ends today: the API
 * compares each figure with the period of the same length right before, and
 * a month counted to its last day would compare days without data yet with
 * whole ones. Dates are calendar days (YYYY-MM-DD), both included, never
 * shifted through a time zone.
 */

export const reportPeriods = [
  'thisWeek',
  'thisMonth',
  'last30Days',
  'last3Months',
  'thisYear',
  'custom',
] as const;

export type ReportPeriod = (typeof reportPeriods)[number];

/** The app's statistics open on «Este mes». */
export const defaultReportPeriod: ReportPeriod = 'thisMonth';

export type ReportGranularity = 'day' | 'week' | 'month';

export type DateRange = { from: string; to: string };

/** The longest period the API takes (366 days) and the oldest day the app offers (5 years back). */
export const maxRangeDays = 366;
export const maxYearsBack = 5;

const calendarDay = /^(\d{4})-(\d{2})-(\d{2})$/;
const dayInMs = 86_400_000;

function toUtc(date: string): number {
  const match = calendarDay.exec(date);
  if (!match) return NaN;
  const [, year, month, day] = match;
  return Date.UTC(Number(year), Number(month) - 1, Number(day));
}

function fromUtc(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

/** Whether a text is a real calendar day (no 31 February). */
export function isCalendarDay(date: string): boolean {
  const time = toUtc(date);
  return !Number.isNaN(time) && fromUtc(time) === date;
}

/** The day `days` after (or before, when negative) a calendar day. */
export function addDays(date: string, days: number): string {
  return fromUtc(toUtc(date) + days * dayInMs);
}

/** The days a range covers, both ends included. */
export function rangeDays({ from, to }: DateRange): number {
  return Math.round((toUtc(to) - toUtc(from)) / dayInMs) + 1;
}

/** The day after the same day `months` earlier; a 31 May looks at 28 February. */
function monthsBefore(date: string, months: number): string {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  // Date.UTC rolls over: day 0 of a month is the last day of the one before.
  const lastDay = new Date(Date.UTC(year, month - months, 0)).getUTCDate();
  return fromUtc(
    Date.UTC(year, month - 1 - months, Math.min(day, lastDay) + 1),
  );
}

/** A preset's days, counted from today (in Caracas). */
export function presetRange(
  period: Exclude<ReportPeriod, 'custom'>,
  today: string,
): DateRange {
  const [year = 0, month = 1] = today.split('-').map(Number);
  switch (period) {
    case 'thisWeek': {
      // getUTCDay: Sunday is 0; the week starts on Monday.
      const weekday = (new Date(toUtc(today)).getUTCDay() + 6) % 7;
      return { from: addDays(today, -weekday), to: today };
    }
    case 'thisMonth':
      return { from: fromUtc(Date.UTC(year, month - 1, 1)), to: today };
    case 'last30Days':
      return { from: addDays(today, -29), to: today };
    case 'last3Months':
      return { from: monthsBefore(today, 3), to: today };
    case 'thisYear':
      return { from: fromUtc(Date.UTC(year, 0, 1)), to: today };
  }
}

/** The app's buckets: by days up to a month, by weeks up to half a year, by months beyond. */
export function granularityFor(range: DateRange): ReportGranularity {
  const days = rangeDays(range);
  if (days <= 31) return 'day';
  if (days <= 183) return 'week';
  return 'month';
}

export type RangeProblem =
  'invalid' | 'order' | 'future' | 'tooLong' | 'tooOld';

/** Why two picked days cannot make a period, or null when they can. */
export function customRangeProblem(
  range: DateRange,
  today: string,
): RangeProblem | null {
  if (!isCalendarDay(range.from) || !isCalendarDay(range.to)) return 'invalid';
  if (range.from > range.to) return 'order';
  if (range.to > today) return 'future';
  if (rangeDays(range) > maxRangeDays) return 'tooLong';
  const [year = 0, month = 1, day = 1] = today.split('-').map(Number);
  const oldest = fromUtc(Date.UTC(year - maxYearsBack, month - 1, day));
  if (range.from < oldest) return 'tooOld';
  return null;
}
