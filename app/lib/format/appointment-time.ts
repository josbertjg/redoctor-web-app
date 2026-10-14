import { formatLocale, timeZone } from '../i18n/config';

/*
 * The day and the hour of an appointment as the API's emails and the app
 * write them (AGENTS.md §5): «jueves 1 de octubre de 2026», «3:00 p. m.».
 * The slot's date and times are the office's wall clock, so they are shown
 * as they come and never moved through a time zone; instants (when the
 * confirmation window opens) are shown in Caracas.
 */

const dayFormat = (zone: string) =>
  new Intl.DateTimeFormat(formatLocale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: zone,
  });

const timeFormat = (zone: string) =>
  new Intl.DateTimeFormat(formatLocale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: zone,
  });

const calendarDay = /^(\d{4})-(\d{2})-(\d{2})$/;
const wallClock = /^(\d{1,2}):(\d{2})/;

/** «jueves, 1 de…» → «jueves 1 de…», as the emails write it. */
const withoutWeekdayComma = (text: string) =>
  text.replace(/^(\p{L}+),\s/u, '$1 ');

/** An hour never breaks across lines: «6:00 p.» here, «m.» there. */
const unbreakable = (text: string) => text.replace(/\s/g, '\u00a0');

/** «jueves 1 de octubre de 2026» from a calendar date (YYYY-MM-DD). */
export function formatAppointmentDay(date: string): string {
  const match = calendarDay.exec(date);
  if (!match) return date;
  const [, year, month, day] = match;
  const utc = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return withoutWeekdayComma(dayFormat('UTC').format(utc));
}

const shortDayFormat = new Intl.DateTimeFormat(formatLocale, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** «jue 15 oct 2026» from a calendar date (YYYY-MM-DD), as a list writes it. */
export function formatAppointmentDayShort(date: string): string {
  const match = calendarDay.exec(date);
  if (!match) return date;
  const [, year, month, day] = match;
  const utc = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return withoutWeekdayComma(shortDayFormat.format(utc));
}

const weekdayShortFormat = new Intl.DateTimeFormat(formatLocale, {
  weekday: 'short',
  timeZone: 'UTC',
});

const dayMonthShortFormat = new Intl.DateTimeFormat(formatLocale, {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

function calendarDayToUtc(date: string): Date | null {
  const match = calendarDay.exec(date);
  if (!match) return null;
  const [, year, month, day] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}

/** «jue» from a calendar date, as a strip of days writes it. */
export function formatWeekdayShort(date: string): string {
  const utc = calendarDayToUtc(date);
  return utc ? weekdayShortFormat.format(utc) : date;
}

/** «15 oct» from a calendar date. */
export function formatDayMonthShort(date: string): string {
  const utc = calendarDayToUtc(date);
  return utc ? dayMonthShortFormat.format(utc) : date;
}

/** «3:00 p. m.» from a wall-clock time (HH:mm). */
export function formatAppointmentTime(time: string): string {
  const match = wallClock.exec(time);
  if (!match) return time;
  const [, hours, minutes] = match;
  const utc = new Date(Date.UTC(2000, 0, 1, Number(hours), Number(minutes)));
  return unbreakable(timeFormat('UTC').format(utc));
}

/** An instant from the API as a day and an hour in Caracas. */
export function formatInstant(instant: string): {
  day: string;
  time: string;
} | null {
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) return null;
  return {
    day: withoutWeekdayComma(dayFormat(timeZone).format(date)),
    time: unbreakable(timeFormat(timeZone).format(date)),
  };
}

/** «octubre de 2026», a month (YYYY-MM) as a calendar's title says it. */
export function formatMonth(month: string): string {
  const [year, number] = month.split('-').map(Number);
  if (!year || !number) return month;
  return new Intl.DateTimeFormat(formatLocale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, number - 1, 1)));
}

/** The weekdays' initials from Monday, as a month grid heads its columns. */
export function weekdayInitials(): string[] {
  const format = new Intl.DateTimeFormat(formatLocale, {
    weekday: 'narrow',
    timeZone: 'UTC',
  });
  // 2026-10-05 is a Monday.
  return Array.from({ length: 7 }, (_, index) =>
    format.format(new Date(Date.UTC(2026, 9, 5 + index))).toUpperCase(),
  );
}

/**
 * Spanish says «a la 1:30» but «a las 3:30»: the article agrees with the
 * hour, and one o'clock is the only singular one. For a message's
 * `{hour, select, one {a la} other {a las}}`, given the time as written.
 */
export function hourAgreement(time: string): 'one' | 'other' {
  return time.trim().startsWith('1:') ? 'one' : 'other';
}

/** The words around a duration, from the app's `specialistProfile.*` keys. */
export type DurationWords = {
  hour: string;
  hours: string;
  minutes: string;
  perAppointment: string;
};

/** How long each appointment lasts: «30 min por cita», «1 hora 30 min por cita», «2 horas por cita». */
export function formatSlotDuration(
  minutes: number,
  words: DurationWords,
): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const parts = [
    hours > 0
      ? `${String(hours)} ${hours === 1 ? words.hour : words.hours}`
      : null,
    rest > 0 ? `${String(rest)} ${words.minutes}` : null,
  ].filter((part) => part !== null);
  return `${parts.join(' ')} ${words.perAppointment}`;
}
