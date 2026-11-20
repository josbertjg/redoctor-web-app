import { QueryClient } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import {
  buildSpecialistAvailability,
  publicAgendaOfficeId,
  publicAgendaSecondOfficeId,
  takenPublicStartTimes,
  weekdaysFrom,
} from '@/tests/factories/public-availability';
import { apiUrl } from '@/tests/msw/api-url';
import { server } from '@/tests/msw/server';

import {
  publicDaySlotsQueryOptions,
  specialistFreeDaysQueryOptions,
  specialistMonthQueryOptions,
} from './public-availability';

const specialistId = 'a0af9566-a53d-4887-8d16-1dfc589c2f3d';

/** Counts the API's answers of the public agenda, and the days it was asked from. */
function countWindows() {
  const asked: string[] = [];
  server.events.on('request:start', ({ request }) => {
    if (request.url.includes('/availability')) {
      asked.push(new URL(request.url).searchParams.get('fromDate') ?? '');
    }
  });
  return asked;
}

describe('the public agenda', () => {
  it('gives each office its next free days from a day, in one answer', async () => {
    const days = await new QueryClient().query(
      specialistFreeDaysQueryOptions(specialistId, '2099-03-02'),
    );
    expect(days[publicAgendaOfficeId]).toEqual(weekdaysFrom('2099-03-02', 12));
    expect(days[publicAgendaSecondOfficeId]).toHaveLength(12);
  });

  it('covers a whole month from the answers of twelve days, and asks no more', async () => {
    const asked = countWindows();
    const month = await new QueryClient().query(
      specialistMonthQueryOptions(specialistId, '2099-03', '2026-11-16'),
    );

    const weekdaysOfMarch = weekdaysFrom('2099-03-01', 31).filter((date) =>
      date.startsWith('2099-03'),
    );
    expect(month[publicAgendaOfficeId]).toEqual(weekdaysOfMarch);
    // 22 weekdays: two answers of twelve, the second from the day after the
    // first one's last (the 17th).
    expect(asked).toEqual(['2099-03-01', '2099-03-18']);
  });

  it('starts the month on today, and asks nothing for a month gone', async () => {
    const asked = countWindows();
    const client = new QueryClient();

    const current = await client.query(
      specialistMonthQueryOptions(specialistId, '2099-03', '2099-03-20'),
    );
    expect(current[publicAgendaOfficeId]?.[0]).toBe('2099-03-20');

    const gone = await client.query(
      specialistMonthQueryOptions(specialistId, '2099-02', '2099-03-20'),
    );
    expect(gone).toEqual({});
    expect(asked).toEqual(['2099-03-20']);
  });

  it('leaves out the days the API calls full', async () => {
    server.use(
      http.get(
        apiUrl('/search/specialists/:specialistId/availability'),
        ({ request }) => {
          const fromDate =
            new URL(request.url).searchParams.get('fromDate') ?? '';
          const answer = buildSpecialistAvailability({
            specialistId,
            fromDate,
            officeIds: [publicAgendaOfficeId],
          });
          const [first] = answer.offices[0]?.nextAvailableDays ?? [];
          if (first) first.available = false;
          return HttpResponse.json(answer);
        },
      ),
    );
    const days = await new QueryClient().query(
      specialistFreeDaysQueryOptions(specialistId, '2099-03-02'),
    );
    expect(days[publicAgendaOfficeId]?.[0]).toBe('2099-03-03');
  });

  it('gives a day’s hours with the booked ones taken', async () => {
    const { slots } = await new QueryClient().query(
      publicDaySlotsQueryOptions(publicAgendaOfficeId, '2099-03-02'),
    );
    expect(
      slots.filter((slot) => !slot.available).map((slot) => slot.startTime),
    ).toEqual([...takenPublicStartTimes]);
    expect(slots.length).toBeGreaterThan(takenPublicStartTimes.length);
  });
});
