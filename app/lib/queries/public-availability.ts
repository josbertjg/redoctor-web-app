import { queryOptions } from '@tanstack/react-query';

import { apiFetch } from '../api/client';
import { daySlotsSchema } from '../schemas/availability';
import {
  lastDayOf,
  nextWindowStart,
  specialistAvailabilityResponseSchema,
  toOfficeFreeDays,
  type OfficeFreeDays,
} from '../schemas/public-availability';

/*
 * The public agenda read in the browser, with no session (the visitor's
 * own address counts the search's 30 a minute, AGENTS.md §5): the public
 * profile's booking shows a specialist's real free time before anyone signs
 * in. A booking made here reads it again (`publicAgendaKeys.all`).
 */

export const publicAgendaKeys = {
  all: ['public-agenda'] as const,
  window: (specialistId: string, fromDate: string) =>
    ['public-agenda', specialistId, 'window', fromDate] as const,
  month: (specialistId: string, month: string, from: string) =>
    ['public-agenda', specialistId, 'month', month, from] as const,
  slots: (officeId: string, date: string) =>
    ['public-agenda', 'office', officeId, 'slots', date] as const,
};

function readWindow(
  specialistId: string,
  fromDate: string,
  signal?: AbortSignal,
) {
  return apiFetch({
    path: '/search/specialists/:specialistId/availability',
    params: { specialistId },
    query: { fromDate },
    schema: specialistAvailabilityResponseSchema,
    ...(signal ? { signal } : {}),
  });
}

/** One answer: each office's next free days from a day (the first free one is its first). */
export function specialistFreeDaysQueryOptions(
  specialistId: string,
  fromDate: string,
) {
  return queryOptions({
    queryKey: publicAgendaKeys.window(specialistId, fromDate),
    queryFn: async ({ signal }) =>
      toOfficeFreeDays(await readWindow(specialistId, fromDate, signal)),
    staleTime: 60_000,
  });
}

/** One month's three windows at most: twelve free days each cover any month. */
const maxWindows = 3;

/**
 * A month of the public agenda: its free days per office, read in windows
 * of twelve from its first day — or from today, in today's month — until
 * the month is covered. A month gone asks nothing.
 */
export function specialistMonthQueryOptions(
  specialistId: string,
  month: string,
  today: string,
) {
  const first = `${month}-01`;
  const from = today > first ? today : first;
  const monthEnd = lastDayOf(month);
  return queryOptions({
    queryKey: publicAgendaKeys.month(specialistId, month, from),
    queryFn: async ({ signal }): Promise<OfficeFreeDays> => {
      const days: Partial<Record<string, Set<string>>> = {};
      let start: string | null = from <= monthEnd ? from : null;
      for (let round = 0; start !== null && round < maxWindows; round++) {
        const response = await readWindow(specialistId, start, signal);
        for (const [officeId, free] of Object.entries(
          toOfficeFreeDays(response),
        )) {
          const kept = (days[officeId] ??= new Set());
          for (const date of free ?? []) {
            if (date.startsWith(month)) kept.add(date);
          }
        }
        start = nextWindowStart(response, monthEnd);
      }
      return Object.fromEntries(
        Object.entries(days).map(([officeId, set]) => [
          officeId,
          [...(set ?? [])].sort(),
        ]),
      );
    },
    staleTime: 60_000,
  });
}

/** A day's hours at an office, every one: the booked and the past ones taken. */
export function publicDaySlotsQueryOptions(officeId: string, date: string) {
  return queryOptions({
    queryKey: publicAgendaKeys.slots(officeId, date),
    queryFn: ({ signal }) =>
      apiFetch({
        path: '/search/offices/:officeId/slots',
        params: { officeId },
        query: { date },
        schema: daySlotsSchema,
        signal,
      }),
    // Someone else may take an hour: a day is read again when it is chosen.
    staleTime: 15_000,
  });
}
