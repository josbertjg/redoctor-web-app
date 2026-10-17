import type { ReactNode } from 'react';

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { specialistSession } from '@/tests/panel';

import { SessionContext, type Session } from '@/app/hooks/use-session';

import { useSignInArrival } from './use-sign-in-arrival';

const wipe = vi.hoisted(() => ({
  calls: [] as { tone: string; whileCovered: () => unknown }[],
}));
vi.mock('@/app/ui/motion/screen-wipe', () => ({
  // The colour stays on screen until a test runs what happens under it.
  wipeScreen: (options: { tone: string; whileCovered: () => unknown }) => {
    wipe.calls.push(options);
    return new Promise<void>(() => undefined);
  },
}));
vi.mock('@/app/lib/analytics/track', () => ({ track: vi.fn() }));

const arrived = specialistSession();
/** Firebase has the person; the API has not said who they are yet. */
const asking = specialistSession(undefined, {
  account: null,
  accountStatus: 'loading',
});
/** Nobody yet: the page offers to sign in. */
const nobody = specialistSession(undefined, {
  status: 'signed-out',
  user: null,
  account: null,
  accountStatus: 'idle',
});

function renderArrival(initial: Session) {
  let session = initial;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
  const hook = renderHook(() => useSignInArrival(), { wrapper });
  return {
    signIn: () => {
      act(() => {
        hook.result.current.onSignedIn(arrived.user, 'google');
      });
    },
    become: (next: Session) => {
      session = next;
      hook.rerender();
    },
    /** The session the page renders from. */
    shown: () => hook.result.current.session,
  };
}

/** What happens under the colour; settles when the colour may open. */
function cover(): Promise<unknown> {
  const [call] = wipe.calls;
  if (!call) throw new Error('No wipe');
  let waiting: unknown;
  act(() => {
    waiting = call.whileCovered();
  });
  return Promise.resolve(waiting);
}

/** Whether the colour may open, within a moment. */
async function opens(waiting: Promise<unknown>): Promise<'open' | 'covered'> {
  return Promise.race([
    waiting.then(() => 'open' as const),
    new Promise<'covered'>((resolve) => {
      setTimeout(() => {
        resolve('covered');
      }, 20);
    }),
  ]);
}

beforeEach(() => {
  wipe.calls = [];
});

describe('useSignInArrival', () => {
  it('covers the page in blue until the API says who signed in', async () => {
    const page = renderArrival(asking);

    page.signIn();
    expect(wipe.calls[0]?.tone).toBe('primary');
    const waiting = cover();
    expect(await opens(waiting)).toBe('covered');

    page.become(arrived);
    expect(await opens(waiting)).toBe('open');
  });

  it('opens at once when the account arrived while the colour covered the page', async () => {
    const page = renderArrival(asking);

    page.signIn();
    page.become(arrived);

    expect(await opens(cover())).toBe('open');
  });

  it('opens when the API refuses the session', async () => {
    const page = renderArrival(asking);

    page.signIn();
    const waiting = cover();
    page.become(nobody);

    expect(await opens(waiting)).toBe('open');
  });

  it('keeps the page as it was until the colour covers it', () => {
    const page = renderArrival(nobody);

    page.signIn();
    // Firebase hands the session over while the colour is still growing
    // from the button: the page keeps offering to sign in.
    page.become(asking);
    expect(page.shown().status).toBe('signed-out');
    page.become(arrived);
    expect(page.shown().account).toBeNull();

    // Under the colour, the person's own view.
    void cover();
    expect(page.shown()).toBe(arrived);
  });
});
