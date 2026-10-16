/*
 * How long ago a notice arrived, in everyday terms (the app's
 * `relativeTimeLabel`): «Ahora», «Hace 5 min», «Hace 3 h», «Ayer», «Hace 4
 * días» and, past a week, the date — counting days stops being useful.
 * The words are the catalog's (`notifications.time.*`); this only decides
 * which one, and the UI formats the date.
 */

export type RelativeTime =
  | { kind: 'now' }
  | { kind: 'minutes'; count: number }
  | { kind: 'hours'; count: number }
  | { kind: 'yesterday' }
  | { kind: 'days'; count: number }
  | { kind: 'date'; instant: string };

const minute = 60_000;
const hour = 60 * minute;
const day = 24 * hour;
const week = 7;

/** `null` when there is no instant to measure from. */
export function relativeTime(
  instant: string | null,
  now: number,
): RelativeTime | null {
  if (instant === null) return null;
  const time = new Date(instant).getTime();
  if (Number.isNaN(time)) return null;

  const elapsed = now - time;
  if (elapsed < minute) return { kind: 'now' };
  if (elapsed < hour)
    return { kind: 'minutes', count: Math.floor(elapsed / minute) };
  if (elapsed < day)
    return { kind: 'hours', count: Math.floor(elapsed / hour) };

  const days = Math.floor(elapsed / day);
  if (days === 1) return { kind: 'yesterday' };
  if (days < week) return { kind: 'days', count: days };
  return { kind: 'date', instant };
}
