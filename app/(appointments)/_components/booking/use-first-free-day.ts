import { useQuery } from '@tanstack/react-query';

import type { TokenHolder } from '@/app/lib/api/types';
import { availableDaysQueryOptions } from '@/app/lib/queries/appointments';
import { freeDays, type AvailableDays } from '@/app/lib/schemas/availability';

import { shiftMonth } from '../month-calendar';

/** The first day with free slots from today on, or null. */
function firstFrom(
  data: AvailableDays | undefined,
  today: string,
): string | null {
  if (data === undefined) return null;
  return (
    [...freeDays(data.days)].filter((day) => day >= today).sort()[0] ?? null
  );
}

/**
 * The day the booking opens on until the person taps another, as the app's
 * does: the first one with free slots from today, in this month or else
 * the next. Null while it is read, or when neither month has one. The
 * months read are the calendar's own (one cache).
 */
export function useFirstFreeDay(
  user: TokenHolder,
  officeId: string,
  today: string,
): string | null {
  const thisMonth = today.slice(0, 7);
  const current = useQuery(
    availableDaysQueryOptions(user, officeId, thisMonth),
  );
  const inCurrent = firstFrom(current.data, today);
  const following = useQuery({
    ...availableDaysQueryOptions(user, officeId, shiftMonth(thisMonth, 1)),
    enabled: current.isSuccess && inCurrent === null,
  });
  return inCurrent ?? firstFrom(following.data, today);
}
