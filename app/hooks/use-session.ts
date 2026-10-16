import { createContext, useContext } from 'react';

import type { Account } from '@/app/lib/auth/account';
import type { SessionUser } from '@/app/lib/firebase/client';

/*
 * The session as every client component sees it (AGENTS.md §9): who is
 * signed in according to Firebase, and who they are according to the API.
 * app/ui/auth/session-provider.tsx keeps it current; without the provider
 * (a tree rendered on its own, a test) nobody is signed in.
 */

export type SessionStatus =
  /**
   * Firebase has not answered yet, for a browser whose hint says a session
   * is likely (the hydrating render, the first frames). Without the hint the
   * page starts signed out and Firebase only loads when asked
   * (`prepareSignIn`).
   */
  'resolving' | 'signed-out' | 'signed-in';

export type AccountStatus = 'idle' | 'loading' | 'ready' | 'error';

/**
 * Why a session ends: the person's own «Cerrar sesión», the API refusing
 * the session, or this device revoked from afar (the push's heartbeat).
 */
export type SignOutReason = 'user' | 'rejected' | 'revoked';

/**
 * Runs before the Firebase session ends, while the token is still valid —
 * the push drops its device token there. Given a few seconds, never more:
 * signing out cannot wait for a slow server.
 */
export type SignOutTask = (reason: SignOutReason) => Promise<void>;

export type Session = {
  status: SessionStatus;
  /**
   * The browser carried the session hint cookie: a session is likely, so a
   * placeholder stands where the account goes while Firebase answers.
   */
  expected: boolean;
  user: SessionUser | null;
  /**
   * Firebase has answered on this page. A page that offers to sign in waits
   * for it before a tap may open the provider's window: Safari refuses a
   * window opened after a slow first load.
   */
  firebaseReady: boolean;
  /**
   * Loads Firebase now, for a page that offers to sign in (the sign-in
   * buttons call it as they appear). With the hint it has started already;
   * calling it again does nothing.
   */
  prepareSignIn: () => void;
  /** The API's view of the person, once `/identity/me` has answered. */
  account: Account | null;
  accountStatus: AccountStatus;
  accountError: unknown;
  /** The account is being read again after a failure: the retry shows it is busy. */
  accountRetrying: boolean;
  retryAccount: () => void;
  signOut: (reason?: SignOutReason) => Promise<void>;
  /** Registers a task to run before signing out; returns the way to unregister it. */
  addSignOutTask: (task: SignOutTask) => () => void;
};

export const noSession: Session = {
  status: 'signed-out',
  expected: false,
  user: null,
  // Without the provider there is no Firebase to wait for.
  firebaseReady: true,
  prepareSignIn: () => undefined,
  account: null,
  accountStatus: 'idle',
  accountError: null,
  accountRetrying: false,
  retryAccount: () => undefined,
  signOut: () => Promise.resolve(),
  addSignOutTask: () => () => undefined,
};

export const SessionContext = createContext<Session>(noSession);

export function useSession(): Session {
  return useContext(SessionContext);
}
