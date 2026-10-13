import type { ReactElement } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

import type { Namespace } from '@/app/lib/i18n/client-messages';
import { meResponseSchema, toAccount } from '@/app/lib/schemas/identity';

import { SessionContext, type Session } from '@/app/hooks/use-session';

import { agendaNow } from './factories/agenda';
import { buildSpecialistMeResponse } from './factories/identity';
import { validToken } from './msw/handlers/identity';
import { renderWithPageMessages } from './render';

/*
 * The specialist's panel under test (M14): a signed-in specialist, the
 * page's own messages only, a Query client that never retries, and the
 * clock fixed at `agendaNow` — `Date` alone, so MSW and the user events keep
 * their timers.
 */

export const specialistUser = {
  id: 'uid-specialist',
  email: 'luis@example.com',
  name: 'Dr. Luis Gómez',
  photo: null,
  provider: 'google' as const,
  getToken: () => Promise.resolve(validToken),
};

export function specialistSession(
  me = buildSpecialistMeResponse(),
  overrides: Partial<Session> = {},
): Session {
  return {
    status: 'signed-in',
    expected: true,
    user: specialistUser,
    account: toAccount(meResponseSchema.parse(me)),
    accountStatus: 'ready',
    accountError: null,
    accountRetrying: false,
    retryAccount: vi.fn(),
    signOut: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
}

export function renderPanel(
  ui: ReactElement,
  namespaces: readonly Namespace[],
  session: Session = specialistSession(),
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return renderWithPageMessages(
    <QueryClientProvider client={client}>
      <SessionContext.Provider value={session}>
        {/* As the panel renders it: inside its main landmark. */}
        <main>{ui}</main>
      </SessionContext.Provider>
    </QueryClientProvider>,
    namespaces,
  );
}

/** Fixes `Date` at the agenda's morning; undo with `vi.useRealTimers()`. */
export function freezeClock(now: Date = agendaNow) {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(now);
}
