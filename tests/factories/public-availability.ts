import type { daySlotsSchema } from '@/app/lib/schemas/availability';
import type { specialistAvailabilityResponseSchema } from '@/app/lib/schemas/public-availability';

import type { z } from 'zod';

/** The office the public profile's factory names (tests/factories/specialists.ts). */
export const publicAgendaOfficeId = '5d0f2c1e-7b0a-4b8e-9c55-2c7f3e8b1a10';

/** A second office of the same specialist, for profiles that need two. */
export const publicAgendaSecondOfficeId =
  '5d0f2c1e-7b0a-4b8e-9c55-2c7f3e8b1a20';

const dayNames = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
] as const;

const weekdayOf = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();

function addDay(date: string): string {
  const next = new Date(`${date}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

/** The next `count` days with hours from a day: Monday to Friday here. */
export function weekdaysFrom(fromDate: string, count: number): string[] {
  const days: string[] = [];
  for (let date = fromDate; days.length < count; date = addDay(date)) {
    const weekday = weekdayOf(date);
    if (weekday !== 0 && weekday !== 6) days.push(date);
  }
  return days;
}

/**
 * `GET /search/specialists/{id}/availability?fromDate=` as the API answers
 * it (its code, `dev` `fe9b343`): each office's next twelve days with hours
 * from that day, the days without hours left out.
 */
export function buildSpecialistAvailability({
  specialistId,
  fromDate,
  officeIds = [publicAgendaOfficeId, publicAgendaSecondOfficeId],
}: {
  specialistId: string;
  fromDate: string;
  officeIds?: readonly string[];
}): z.input<typeof specialistAvailabilityResponseSchema> & {
  specialistId: string;
} {
  return {
    specialistId,
    offices: officeIds.map((officeId) => ({
      officeId,
      description: null,
      nextAvailableDays: weekdaysFrom(fromDate, 12).map((date) => ({
        date,
        dayOfWeek: dayNames[weekdayOf(date)] ?? 'MONDAY',
        officeId,
        available: true,
        officeHours: [{ startTime: '08:00', endTime: '19:00' }],
      })),
    })),
  };
}

/** The hours already booked on every day the handler answers. */
export const takenPublicStartTimes = ['09:00', '15:00'] as const;

/**
 * `GET /search/offices/{id}/slots?date=`: every hour of the day, a morning,
 * an afternoon and an evening, two of them already booked. 10:00 is free
 * here and taken by the time it is booked (the e2e fake API's
 * `takenStartTime`).
 */
export function buildPublicDaySlots(
  officeId: string,
  date: string,
): z.input<typeof daySlotsSchema> & { officeId: string; timezone: string } {
  const times = ['08:30', '09:00', '09:30', '10:00', '14:00', '15:00', '18:30'];
  return {
    officeId,
    date,
    timezone: 'America/Caracas',
    slots: times.map((startTime) => ({
      startTime,
      endTime: startTime,
      available: !(takenPublicStartTimes as readonly string[]).includes(
        startTime,
      ),
    })),
  };
}
