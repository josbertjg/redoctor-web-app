'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { forgetPerson, identifyPerson } from '@/app/lib/analytics/identity';
import { track } from '@/app/lib/analytics/track';
import { isApiError } from '@/app/lib/api/errors';
import { canUseSpecialistArea } from '@/app/lib/auth/account';
import {
  forgetPanelHint,
  forgetSessionHint,
  hasSessionHint,
  rememberPanelHint,
  rememberSessionHint,
} from '@/app/lib/auth/session-hint';
import { setTokenSource } from '@/app/lib/auth/token';
import type { SessionUser } from '@/app/lib/firebase/client';
import { reportPerson } from '@/app/lib/observability/report';
import { identityKeys } from '@/app/lib/queries/identity-keys';

import { toast } from '@/app/ui/toast';

import {
  SessionContext,
  type AccountStatus,
  type Session,
  type SessionStatus,
  type SignOutReason,
  type SignOutTask,
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
 *
 * Firebase can also end a session on its own — signed out in another tab, a
 * revoked or disabled account — or hand over to another person: whenever the
 * person changes, what was theirs is forgotten here too.
 *
 * Firebase starts only where it has something to say: at once when the
 * hint says this browser has a session, and otherwise when the page offers
 * to sign in (`prepareSignIn`, called by the sign-in buttons) or the hint
 * appears while the page was away (a sign-in in another tab). A visitor who
 * never signed in loads none of it: some 40 KB, and on phones and Safari,
 * where Firebase opens its sign-in frame at start, some 130 KB more.
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

/** What the tasks that run before signing out get, all together. */
const SIGN_OUT_TASKS_TIMEOUT_MS = 4000;

const withTimeout = (work: Promise<void>, ms: number) =>
  Promise.race([
    work,
    new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    }),
  ]);

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
    status: expected ? 'resolving' : 'signed-out',
    user: null,
  });
  /** Firebase is wanted on this page: the hint, or a page that offers to sign in. */
  const [active, setActive] = useState(expected);
  /** Firebase has answered (or could not load): a sign-in tap may open its window. */
  const [firebaseReady, setFirebaseReady] = useState(false);
  const prepareSignIn = useCallback(() => {
    setActive(true);
  }, []);
  /** Whose session the page last saw (Firebase's uid), to notice a change of person. */
  const lastPerson = useRef<string | null>(null);
  /** What runs before the session ends (the push drops its device). */
  const signOutTasks = useRef(new Set<SignOutTask>());

  const addSignOutTask = useCallback((task: SignOutTask) => {
    signOutTasks.current.add(task);
    return () => {
      signOutTasks.current.delete(task);
    };
  }, []);

  // Without the hint, a sign-in elsewhere (another tab) leaves it in the
  // cookie: coming back to this page starts Firebase, which finds it.
  useEffect(() => {
    if (active) return;
    const wakeOnHint = () => {
      if (
        document.visibilityState === 'visible' &&
        hasSessionHint(document.cookie)
      ) {
        setActive(true);
      }
    };
    document.addEventListener('visibilitychange', wakeOnHint);
    window.addEventListener('focus', wakeOnHint);
    return () => {
      document.removeEventListener('visibilitychange', wakeOnHint);
      window.removeEventListener('focus', wakeOnHint);
    };
  }, [active]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let stop: (() => void) | undefined;
    import('@/app/lib/firebase/client')
      .then(({ watchSession }) => {
        if (cancelled) return;
        stop = watchSession((user) => {
          setFirebaseReady(true);
          setTokenSource(user ? user.getToken : null);
          if (user) {
            rememberSessionHint();
          } else {
            forgetSessionHint();
            forgetPanelHint();
          }
          const previous = lastPerson.current;
          lastPerson.current = user?.id ?? null;
          if (previous !== null && previous !== lastPerson.current) {
            forgetPerson();
            reportPerson(null);
            queryClient.clear();
          }
          setState({ status: user ? 'signed-in' : 'signed-out', user });
        });
      })
      .catch(() => {
        // Firebase could not load (a blocked script, an old browser): the
        // page works signed out, and a sign-in tries to load it again.
        if (cancelled) return;
        setFirebaseReady(true);
        setState({ status: 'signed-out', user: null });
      });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [active, queryClient]);

  const { user } = state;
  const query = useQuery({
    queryKey: identityKeys.me((user ?? nobody).id),
    queryFn: async ({ signal }) => {
      // The account's reader — zod and the API's contract — loads with the
      // first signed-in page, not with every visitor's landing (§8.10).
      const { readAccount } = await import('@/app/lib/queries/identity');
      return readAccount(user ?? nobody, signal);
    },
    enabled: user !== null,
    // Facets change in the app, rarely while the web is open.
    staleTime: 5 * 60_000,
  });
  const account = user !== null && query.data !== undefined ? query.data : null;

  useEffect(() => {
    if (account === null) return;
    const person = { id: account.id, role: account.role };
    identifyPerson(person);
    reportPerson(person);
    // A specialist's browser goes to the panel from the next visit on (`/`
    // redirects on the server); anyone else's keeps the landing.
    if (canUseSpecialistArea(account)) rememberPanelHint();
    else forgetPanelHint();
  }, [account]);

  const signOut = async (reason: SignOutReason = 'user') => {
    // Counted for the person leaving, before analytics forgets them.
    track('web_signout', {});
    try {
      // With the token still valid, and never for long: a slow server
      // cannot hold the person in.
      await withTimeout(
        Promise.allSettled(
          [...signOutTasks.current].map((task) => task(reason)),
        ).then(() => undefined),
        SIGN_OUT_TASKS_TIMEOUT_MS,
      );
      const { signOutUser } = await import('@/app/lib/firebase/client');
      await signOutUser();
    } finally {
      // Even when Firebase could not be reached, nothing of the person stays.
      setTokenSource(null);
      forgetSessionHint();
      forgetPanelHint();
      forgetPerson();
      reportPerson(null);
      queryClient.clear();
    }
  };

  const rejected = user !== null && rejectsSession(query.error);
  useEffect(() => {
    if (!rejected) return;
    toast(expiredNotice, { id: 'session-expired' });
    void signOut('rejected');
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
    firebaseReady,
    prepareSignIn,
    account,
    accountStatus,
    accountError: query.error,
    accountRetrying: query.isError && query.isFetching,
    retryAccount: () => {
      // Another tap while it is on its way would cancel it and start over.
      if (query.isFetching) return;
      void query.refetch();
    },
    signOut,
    addSignOutTask,
  };

  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
}
