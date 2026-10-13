import { currencySymbol, formatMoney } from './money';
import { formatLocale } from '../i18n/config';

/*
 * The figures of the specialist's statistics (M14), as the app writes them
 * (`ReportFigureFormat`): whole figures with the locale's thousands, a big
 * card's figure compact past 9.999 so it fits, a rating with one decimal, a
 * share as a whole percent, money with its currency's sign. And the words
 * of a period: its days, its buckets, its weekdays and hours.
 */

const figureFormat = new Intl.NumberFormat(formatLocale, {
  maximumFractionDigits: 0,
});

// «12,9 mil», as the app writes it (the short form of es-VE says «12,9 k»).
const compactFormat = new Intl.NumberFormat(formatLocale, {
  notation: 'compact',
  compactDisplay: 'long',
  maximumFractionDigits: 1,
});

const ratingFormat = new Intl.NumberFormat(formatLocale, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const percentFormat = new Intl.NumberFormat(formatLocale, {
  style: 'percent',
  maximumFractionDigits: 0,
});

/** Past this, a card's big figure goes compact. */
const compactFrom = 10_000;

/** «1.240»: rounded, with its thousands. */
export function formatFigure(value: number): string {
  return figureFormat.format(Math.round(value));
}

/** A card's big figure: whole up to 9.999, compact beyond («12,9 mil»), so it fits. */
export function formatHeadlineFigure(value: number): string {
  return Math.abs(value) < compactFrom
    ? formatFigure(value)
    : compactFormat.format(value);
}

/** A rating with one decimal: «4,6». */
export function formatRating(value: number): string {
  return ratingFormat.format(value);
}

/** A share from 0 to 1 as a whole percent: «47 %». */
export function formatPercent(share: number): string {
  return percentFormat.format(share);
}

/** A card's money: «$ 4.350», no cents (an indicator needs none), compact past 9.999. */
export function formatHeadlineMoney(value: number, currency: string): string {
  return `${currencySymbol(currency)} ${formatHeadlineFigure(value)}`;
}

/** An exact amount, cents only when it has them: «$ 1.150», «$ 49,99». */
export function formatExactMoney(value: number, currency: string): string {
  return formatMoney(Math.round(value * 100) / 100, currency);
}

const calendarDay = /^(\d{4})-(\d{2})-(\d{2})$/;
const calendarMonth = /^(\d{4})-(\d{2})$/;

function utcDay(date: string): Date | null {
  const match = calendarDay.exec(date);
  if (!match) return null;
  const [, year, month, day] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}

const dayMonthFormat = new Intl.DateTimeFormat(formatLocale, {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

const dayMonthYearFormat = new Intl.DateTimeFormat(formatLocale, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

const monthFormat = new Intl.DateTimeFormat(formatLocale, {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** «1 – 13 oct 2026», «28 sept – 13 oct 2026», «15 dic 2025 – 13 ene 2026». */
export function formatDayRange(from: string, to: string): string {
  const start = utcDay(from);
  const end = utcDay(to);
  if (!start || !end) return `${from} – ${to}`;
  if (from === to) return dayMonthYearFormat.format(end);
  if (start.getUTCFullYear() !== end.getUTCFullYear()) {
    return `${dayMonthYearFormat.format(start)} – ${dayMonthYearFormat.format(end)}`;
  }
  if (start.getUTCMonth() === end.getUTCMonth()) {
    return `${String(start.getUTCDate())} – ${dayMonthYearFormat.format(end)}`;
  }
  return `${dayMonthFormat.format(start)} – ${dayMonthYearFormat.format(end)}`;
}

/**
 * A bucket of a series as an axis names it: a day «13 oct», a week by its
 * Monday «6 oct» (the caller adds «Semana del…» where it reads as text), a
 * month «oct 2026». The bucket comes as the API writes it.
 */
export function formatBucket(bucket: string): string {
  const day = utcDay(bucket);
  if (day) return dayMonthFormat.format(day);
  const month = calendarMonth.exec(bucket);
  if (month) {
    const [, year, number] = month;
    return monthFormat.format(
      new Date(Date.UTC(Number(year), Number(number) - 1, 1)),
    );
  }
  return bucket;
}

const weekdayFormat = new Intl.DateTimeFormat(formatLocale, {
  weekday: 'long',
  timeZone: 'UTC',
});

const weekdayShortFormat = new Intl.DateTimeFormat(formatLocale, {
  weekday: 'short',
  timeZone: 'UTC',
});

/** A weekday as the API numbers it, Monday 1: «lunes» (or «lun»). */
export function formatWeekday(
  weekday: number,
  style: 'long' | 'short' = 'long',
): string {
  // 2026-10-05 is a Monday.
  const date = new Date(Date.UTC(2026, 9, 4 + weekday));
  return (style === 'long' ? weekdayFormat : weekdayShortFormat).format(date);
}

const hourFormat = new Intl.DateTimeFormat(formatLocale, {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: 'UTC',
});

/** An hour of the day (0–23) as a clock says it: «3:00 p. m.», never broken across lines. */
export function formatHour(hour: number): string {
  return hourFormat
    .format(new Date(Date.UTC(2000, 0, 1, hour)))
    .replace(/\s/g, '\u00a0');
}
