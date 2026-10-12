import { createContext, useContext } from 'react';

import type { SessionUser } from '@/app/lib/firebase/client';
import type { Account } from '@/app/lib/schemas/identity';

/*
 * The session as every client component sees it (AGENTS.md §9): who is
 * signed in according to Firebase, and who they are according to the API.
 * app/ui/auth/session-provider.tsx keeps it current; without the provider
 * (a tree rendered on its own, a test) nobody is signed in.
 */

export type SessionStatus =
  /** Firebase has not answered yet (the hydrating render, the first frames). */
  'resolving' | 'signed-out' | 'signed-in';

export type AccountStatus = 'idle' | 'loading' | 'ready' | 'error';

export type Session = {
  status: SessionStatus;
  /**
   * The browser carried the session hint cookie: a session is likely, so a
   * placeholder stands where the account goes while Firebase answers.
   */
  expected: boolean;
  user: SessionUser | null;
  /** The API's view of the person, once `/identity/me` has answered. */
  account: Account | null;
  accountStatus: AccountStatus;
  accountError: unknown;
  retryAccount: () => void;
  signOut: () => Promise<void>;
};

export const noSession: Session = {
  status: 'signed-out',
  expected: false,
  user: null,
  account: null,
  accountStatus: 'idle',
  accountError: null,
  retryAccount: () => undefined,
  signOut: () => Promise.resolve(),
};

export const SessionContext = createContext<Session>(noSession);

export function useSession(): Session {
  return useContext(SessionContext);
}
