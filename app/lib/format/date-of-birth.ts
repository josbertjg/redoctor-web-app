import { timeZone } from '../i18n/config';

/*
 * A date of birth is a calendar date (`YYYY-MM-DD`), never an instant
 * (AGENTS.md §5): it is compared as text with today's date in Caracas,
 * never shifted through a time zone. The patient's sign-up asks for an
 * adult, as the app does.
 */

export const adultAge = 18;

const oldestAge = 120;

const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/;

export type BirthDateProblem = 'empty' | 'invalid' | 'tooYoung';

/** Today's calendar date in Caracas, `YYYY-MM-DD`. */
export function todayInCaracas(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

const pad = (value: number, length = 2) => String(value).padStart(length, '0');

/** The same day `years` earlier; a 29 February falls on the 28th. */
export function yearsBefore(date: string, years: number): string {
  const match = isoDate.exec(date);
  if (!match) throw new Error(`Not a calendar date: ${date}`);
  const year = Number(match[1]) - years;
  const month = Number(match[2]);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const day = Math.min(Number(match[3]), lastDay);
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

function isRealDate(value: string): boolean {
  const match = isoDate.exec(value);
  if (!match) return false;
  const [year, month, day] = [match[1], match[2], match[3]].map(Number) as [
    number,
    number,
    number,
  ];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** The latest date of birth of an adult today, for the date picker's `max`. */
export function latestAdultBirthDate(today = todayInCaracas()): string {
  return yearsBefore(today, adultAge);
}

/** The earliest date the picker offers, for its `min`. */
export function earliestBirthDate(today = todayInCaracas()): string {
  return yearsBefore(today, oldestAge);
}

/** «14/05/1990», as the app shows a date of birth (a calendar date: never shifted). */
export function formatBirthDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

/**
 * What is wrong with a date of birth. The account holder must be an adult,
 * as in the app; someone in their care may be any age (`adult: false`), as
 * long as they were born already.
 */
export function birthDateProblem(
  value: string,
  today = todayInCaracas(),
  { adult = true }: { adult?: boolean } = {},
): BirthDateProblem | null {
  if (value === '') return 'empty';
  if (!isRealDate(value) || value < earliestBirthDate(today)) return 'invalid';
  if (adult) return value > latestAdultBirthDate(today) ? 'tooYoung' : null;
  return value > today ? 'invalid' : null;
}
