import type { AppointmentSummary } from '@/app/lib/schemas/appointments';

/** An instant as a number to compare; something that is not one sorts first. */
const instant = (iso: string) => {
  const time = new Date(iso).getTime();
  return Number.isNaN(time) ? 0 : time;
};

/** The day's order: the earliest first. */
export function byStart(a: AppointmentSummary, b: AppointmentSummary): number {
  return instant(a.startsAt) - instant(b.startsAt);
}

/** The history's order: the latest first. */
export function byStartDescending(
  a: AppointmentSummary,
  b: AppointmentSummary,
): number {
  return instant(b.startsAt) - instant(a.startsAt);
}
