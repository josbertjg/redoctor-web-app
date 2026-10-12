'use client';

import { useEffect, useState, type ReactNode } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { forgetPerson, identifyPerson } from '@/app/lib/analytics/identity';
import { track } from '@/app/lib/analytics/track';
import { isApiError } from '@/app/lib/api/errors';
import {
  forgetSessionHint,
  rememberSessionHint,
} from '@/app/lib/auth/session-hint';
import { setTokenSource } from '@/app/lib/auth/token';
import type { SessionUser } from '@/app/lib/firebase/client';
import { reportPerson } from '@/app/lib/observability/report';
import { meQueryOptions } from '@/app/lib/queries/identity';

import { toast } from '@/app/ui/toast';

import {
  SessionContext,
  type AccountStatus,
  type Session,
  type SessionStatus,
} from '@/app/hooks/use-session';

/*
 * Keeps the session current for the whole page (AGENTS.md §9): follows
 * Firebase (loaded on demand, so the landing's JS stays without it), hands
 * the API client a way to get the token, reads `/identity/me` once someone
 * is signed in, and tells analytics and error reports who the person is —
 * their id and role, nothing else. Sign-out undoes all of it and clears the
 * Query cache, so nothing of one person survives for the next.
 *
 * Only the API closes a session (the app does the same): a 401, 403 or 404
 * on `/me` means this session is not valid, so the web signs out and says
 * so. Any other failure — no network, the API down, a broken answer — only
 * means the account could not be read, and that offers a retry.
 */

type SessionState = { status: SessionStatus; user: SessionUser | null };

/** Stands in while nobody is signed in: the query is disabled then. */
const nobody = {
  id: 'nobody',
  getToken: () => Promise.reject(new Error('No session')),
};

const rejectingStatuses = new Set([401, 403, 404]);

function rejectsSession(error: unknown): boolean {
  return (
    isApiError(error) &&
    error.status !== undefined &&
    rejectingStatuses.has(error.status)
  );
}

type SessionProviderProps = {
  /** The request carried the session hint cookie (app/lib/auth/session-hint). */
  expected: boolean;
  /** Already translated on the server (i18n: `auth.sessionExpired`). */
  expiredNotice: string;
  children: ReactNode;
};

export function SessionProvider({
  expected,
  expiredNotice,
  children,
}: SessionProviderProps) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<SessionState>({
    status: 'resolving',
    user: null,
  });

  useEffect(() => {
    let cancelled = false;
    let stop: (() => void) | undefined;
    import('@/app/lib/firebase/client')
      .then(({ watchSession }) => {
        if (cancelled) return;
        stop = watchSession((user) => {
          setTokenSource(user ? user.getToken : null);
          if (user) rememberSessionHint();
          else forgetSessionHint();
          setState({ status: user ? 'signed-in' : 'signed-out', user });
        });
      })
      .catch(() => {
        // Firebase could not load (a blocked script, an old browser): the
        // page works signed out.
        if (!cancelled) setState({ status: 'signed-out', user: null });
      });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);

  const { user } = state;
  const query = useQuery({
    ...meQueryOptions(user ?? nobody),
    enabled: user !== null,
  });
  const account = user !== null && query.data !== undefined ? query.data : null;

  useEffect(() => {
    if (account === null) return;
    const person = { id: account.id, role: account.role };
    identifyPerson(person);
    reportPerson(person);
  }, [account]);

  const signOut = async () => {
    const { signOutUser } = await import('@/app/lib/firebase/client');
    await signOutUser();
    setTokenSource(null);
    forgetSessionHint();
    forgetPerson();
    reportPerson(null);
    track('web_signout', {});
    queryClient.clear();
  };

  const rejected = user !== null && rejectsSession(query.error);
  useEffect(() => {
    if (!rejected) return;
    toast(expiredNotice, { id: 'session-expired' });
    void signOut();
    // signOut is a plain function of this render; the rejection is the signal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rejected, expiredNotice]);

  const accountStatus: AccountStatus =
    user === null
      ? 'idle'
      : query.isError && !rejected
        ? 'error'
        : query.data === undefined
          ? 'loading'
          : 'ready';

  const session: Session = {
    status: state.status,
    expected,
    user,
    account,
    accountStatus,
    accountError: query.error,
    retryAccount: () => {
      void query.refetch();
    },
    signOut,
  };

  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
}
