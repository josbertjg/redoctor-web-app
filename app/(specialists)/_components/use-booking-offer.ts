import { canUseSpecialistArea } from '@/app/lib/auth/account';

import { useSession } from '@/app/hooks/use-session';

/**
 * What the profile offers the person looking at it: `book` to a patient or
 * a visitor; to a specialist never booking (AGENTS.md §1) — on their own
 * profile, `own` (how their patients see it), on anyone else's `none` —;
 * and `wait` in a browser with the panel hint while the session is read,
 * instead of offering booking first.
 */
export type BookingOffer = 'book' | 'own' | 'none' | 'wait';

export function useBookingOffer(
  specialistId: string,
  expectSpecialist: boolean,
): BookingOffer {
  const { status, account } = useSession();

  if (account !== null && canUseSpecialistArea(account)) {
    return account.specialist.id === specialistId ? 'own' : 'none';
  }
  const waiting =
    status === 'resolving' || (status === 'signed-in' && account === null);
  return expectSpecialist && waiting ? 'wait' : 'book';
}
