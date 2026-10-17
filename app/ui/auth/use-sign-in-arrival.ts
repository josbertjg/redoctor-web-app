import { useEffect, useRef, useState } from 'react';

import type { AuthProvider } from '@/app/lib/auth/last-provider';

import { wipeScreen } from '@/app/ui/motion/screen-wipe';

import { useSession, type Session } from '@/app/hooks/use-session';
import { useSignInTracking } from '@/app/hooks/use-sign-in-tracking';

/** A sign-in made on this page, until the page knows how it went. */
type Arrival = {
  /** Firebase has the person: a sign-out after this is the API's refusal. */
  signedIn: boolean;
  /** The page knows: the account arrived, or the session could not be had. */
  known: boolean;
  /** Opens the wipe, when the page learns it while the colour covers it. */
  resolve: (() => void) | null;
};

/**
 * The sign-in on the pages that sign in in place — the appointment, the
 * invitation, the booking —, where signing in is a big moment: the
 * person's own view arrives under the blue wipe (AGENTS.md §8, rule 13),
 * which opens once the page knows who they are, or that it could not.
 *
 * Firebase hands the session over as the provider's window answers, while
 * the colour has only begun to grow from the button pressed: the page
 * renders from `session`, the one it showed when the sign-in came back,
 * until the colour covers it, and from the person's own after — so the
 * button never turns into the next view under the circle's first frames.
 * `onSignedIn` is the sign-in buttons' handler; the sign-in is counted as
 * `useSignInTracking` counts it.
 */
export function useSignInArrival() {
  const countSignIn = useSignInTracking();
  const live = useSession();
  const { account, status, accountStatus } = live;
  const arrival = useRef<Arrival | null>(null);
  /** What the page showed when the sign-in came back, while the colour covers it. */
  const [held, setHeld] = useState<Session | null>(null);

  useEffect(() => {
    const waiting = arrival.current;
    if (waiting === null) return;
    if (status === 'signed-in') waiting.signedIn = true;
    const known =
      account !== null ||
      accountStatus === 'error' ||
      (waiting.signedIn && status === 'signed-out');
    if (!known) return;
    waiting.known = true;
    waiting.resolve?.();
    arrival.current = null;
  }, [account, status, accountStatus]);

  const onSignedIn = (user: unknown, provider: AuthProvider) => {
    countSignIn(user, provider);
    // As the page knew it when the buttons answered.
    const waiting: Arrival = {
      signedIn: status === 'signed-in',
      known: account !== null,
      resolve: null,
    };
    arrival.current = waiting;
    setHeld(live);
    const release = () => {
      setHeld(null);
    };
    void wipeScreen({
      tone: 'primary',
      whileCovered: () => {
        release();
        return waiting.known
          ? undefined
          : new Promise<void>((resolve) => {
              waiting.resolve = resolve;
            });
      },
    })
      // However the wipe ends, the page follows the session again.
      .finally(release);
  };

  return { session: held ?? live, onSignedIn };
}
