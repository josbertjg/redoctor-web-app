import { todayInCaracas } from './date-of-birth';
import { formatLocale, timeZone } from '../i18n/config';

/*
 * Instants from the API (UTC) as days and hours in Caracas, in Spanish
 * (AGENTS.md §5): «12 de octubre de 2026», «3:00 p. m.». The appointment
 * has its own words (appointment-time.ts: the office's wall clock); these
 * are for everything else — a receipt's period, a payment's deadline.
 */

const dayFormat = new Intl.DateTimeFormat(formatLocale, {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone,
});

const shortDayFormat = new Intl.DateTimeFormat(formatLocale, {
  day: 'numeric',
  month: 'short',
  timeZone,
});

const shortDayYearFormat = new Intl.DateTimeFormat(formatLocale, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone,
});

const timeFormat = new Intl.DateTimeFormat(formatLocale, {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone,
});

const calendarDay = /^(\d{4})-(\d{2})-(\d{2})$/;

/** An hour never breaks across lines: «6:00 p.» here, «m.» there. */
const unbreakable = (text: string) => text.replace(/\s/g, '\u00a0');

function parse(instant: string): Date | null {
  const date = new Date(instant);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** «12 de octubre de 2026», or null when the text is not an instant. */
export function formatDate(instant: string): string | null {
  const date = parse(instant);
  return date ? dayFormat.format(date) : null;
}

/** «3:00 p. m.» */
export function formatTime(instant: string): string | null {
  const date = parse(instant);
  return date ? unbreakable(timeFormat.format(date)) : null;
}

/** «12 de octubre de 2026, 3:00 p. m.»: where the hour counts as much as the day. */
export function formatDateTime(instant: string): string | null {
  const day = formatDate(instant);
  const time = formatTime(instant);
  return day && time ? `${day}, ${time}` : null;
}

/** «1 oct – 31 oct 2026», a receipt's period, or null without both ends. */
export function formatPeriod(
  start: string | null | undefined,
  end: string | null | undefined,
): string | null {
  const from = start ? parse(start) : null;
  const to = end ? parse(end) : null;
  if (!from || !to) return null;
  return `${shortDayFormat.format(from)} – ${shortDayYearFormat.format(to)}`;
}

/** «12 de octubre de 2026» from a calendar date (YYYY-MM-DD), never shifted through a time zone. */
export function formatCalendarDate(date: string): string {
  const match = calendarDay.exec(date);
  if (!match) return date;
  const [, year, month, day] = match;
  const utc = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return new Intl.DateTimeFormat(formatLocale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(utc);
}

const dayInMs = 86_400_000;

const toUtcDay = (date: string) => {
  const match = calendarDay.exec(date);
  if (!match) return NaN;
  const [, year, month, day] = match;
  return Date.UTC(Number(year), Number(month) - 1, Number(day));
};

/**
 * Calendar days in Caracas from today to an instant, never negative: how
 * the app counts «Tu plan se cancelará en {days} días».
 */
export function calendarDaysUntil(instant: string, now = new Date()): number {
  const target = parse(instant);
  if (!target) return 0;
  const days = Math.round(
    (toUtcDay(todayInCaracas(target)) - toUtcDay(todayInCaracas(now))) /
      dayInMs,
  );
  return Number.isNaN(days) || days < 0 ? 0 : days;
}
