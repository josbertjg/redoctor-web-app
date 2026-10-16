import { useEffect } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getSessionToken } from '@/app/lib/auth/token';
import type { SessionUser } from '@/app/lib/firebase/client';

import { renderWithIntl } from '@/tests/render';

import { useSession } from '@/app/hooks/use-session';

import { SessionProvider } from './session-provider';
import { buildSpecialistMeResponse } from '../../../tests/factories/identity';
import { apiUrl } from '../../../tests/msw/api-url';
import { validToken } from '../../../tests/msw/handlers/identity';
import { server } from '../../../tests/msw/server';

const firebase = vi.hoisted(() => ({
  listener: undefined as ((user: SessionUser | null) => void) | undefined,
  stop: vi.fn(),
  signOutUser: vi.fn(() => Promise.resolve()),
}));
vi.mock('@/app/lib/firebase/client', () => ({
  watchSession: (listener: (user: SessionUser | null) => void) => {
    firebase.listener = listener;
    return firebase.stop;
  },
  signOutUser: firebase.signOutUser,
}));

const user: SessionUser = {
  id: 'uid-1',
  email: 'ana@example.com',
  name: 'Ana Pérez',
  photo: null,
  provider: 'google',
  getToken: () => Promise.resolve(validToken),
};

function Probe() {
  const session = useSession();
  return (
    <div>
      <p>status: {session.status}</p>
      <p>account: {session.accountStatus}</p>
      <p>name: {session.account?.name ?? '-'}</p>
      <p>firebase: {session.firebaseReady ? 'ready' : 'not yet'}</p>
      <button
        type="button"
        onClick={() => {
          void session.signOut();
        }}
      >
        Salir
      </button>
      <button type="button" onClick={session.prepareSignIn}>
        Preparar
      </button>
    </div>
  );
}

/** A browser whose hint says it has a session, unless told otherwise. */
function renderProvider(expected = true) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return renderWithIntl(
    <QueryClientProvider client={client}>
      <SessionProvider
        expected={expected}
        expiredNotice="Tu sesión ha caducado"
      >
        <Probe />
      </SessionProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  firebase.listener = undefined;
  document.cookie = 'redoctor-session=; path=/; max-age=0';
  document.cookie = 'redoctor-panel=; path=/; max-age=0';
});

describe('SessionProvider', () => {
  it('without the hint, starts signed out and loads Firebase only when the page offers to sign in', async () => {
    renderProvider(false);
    expect(screen.getByText('status: signed-out')).toBeInTheDocument();
    expect(screen.getByText('firebase: not yet')).toBeInTheDocument();
    // Nothing asked for Firebase: a visitor with no session loads none of it.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(firebase.listener).toBeUndefined();

    await userEvent.click(screen.getByRole('button', { name: 'Preparar' }));
    await waitFor(() => {
      expect(firebase.listener).toBeDefined();
    });
    firebase.listener?.(null);

    expect(await screen.findByText('firebase: ready')).toBeInTheDocument();
    expect(screen.getByText('status: signed-out')).toBeInTheDocument();
  });

  it('without the hint, finds a session another tab opened once the page is back in view', async () => {
    renderProvider(false);
    document.cookie = 'redoctor-session=1; path=/';

    document.dispatchEvent(new Event('visibilitychange'));
    await waitFor(() => {
      expect(firebase.listener).toBeDefined();
    });
    firebase.listener?.(user);

    expect(await screen.findByText('status: signed-in')).toBeInTheDocument();
    expect(await screen.findByText('name: Ana Pérez')).toBeInTheDocument();
  });

  it('resolves to signed out when Firebase has nobody', async () => {
    renderProvider();
    expect(screen.getByText('status: resolving')).toBeInTheDocument();

    await waitFor(() => {
      expect(firebase.listener).toBeDefined();
    });
    firebase.listener?.(null);

    expect(await screen.findByText('status: signed-out')).toBeInTheDocument();
    expect(screen.getByText('account: idle')).toBeInTheDocument();
    await expect(getSessionToken()).resolves.toBeNull();
  });

  it('reads the account once someone is signed in, and remembers the hint', async () => {
    renderProvider();
    await waitFor(() => {
      expect(firebase.listener).toBeDefined();
    });

    firebase.listener?.(user);

    expect(await screen.findByText('status: signed-in')).toBeInTheDocument();
    expect(await screen.findByText('name: Ana Pérez')).toBeInTheDocument();
    expect(screen.getByText('account: ready')).toBeInTheDocument();
    expect(document.cookie).toContain('redoctor-session=1');
    // A patient keeps the landing: no panel hint.
    expect(document.cookie).not.toContain('redoctor-panel=1');
    await expect(getSessionToken()).resolves.toBe(validToken);
  });

  it('remembers the panel for a specialist, and forgets it on signing out', async () => {
    server.use(
      http.get(apiUrl('/identity/me'), () =>
        HttpResponse.json(buildSpecialistMeResponse()),
      ),
    );
    renderProvider();
    await waitFor(() => {
      expect(firebase.listener).toBeDefined();
    });
    firebase.listener?.(user);

    await screen.findByText('name: Dr. Luis Gómez');
    await waitFor(() => {
      expect(document.cookie).toContain('redoctor-panel=1');
    });

    await userEvent.click(screen.getByRole('button', { name: 'Salir' }));
    await waitFor(() => {
      expect(document.cookie).not.toContain('redoctor-panel=1');
    });
  });

  it('signs out through Firebase and forgets everything', async () => {
    renderProvider(true);
    await waitFor(() => {
      expect(firebase.listener).toBeDefined();
    });
    firebase.listener?.(user);
    await screen.findByText('name: Ana Pérez');

    await userEvent.click(screen.getByRole('button', { name: 'Salir' }));
    await waitFor(() => {
      expect(firebase.signOutUser).toHaveBeenCalledOnce();
    });
    firebase.listener?.(null);

    expect(await screen.findByText('status: signed-out')).toBeInTheDocument();
    expect(document.cookie).not.toContain('redoctor-session=1');
    await expect(getSessionToken()).resolves.toBeNull();
  });

  it('stops following Firebase when it unmounts', async () => {
    const { unmount } = renderProvider();
    await waitFor(() => {
      expect(firebase.listener).toBeDefined();
    });

    unmount();

    expect(firebase.stop).toHaveBeenCalled();
  });

  it('runs what was registered to run before signing out, with the reason, and Firebase after', async () => {
    const order: string[] = [];
    const task = vi.fn((reason: string) => {
      order.push(`task:${reason}`);
      return Promise.resolve();
    });
    firebase.signOutUser.mockImplementation(() => {
      order.push('firebase');
      return Promise.resolve();
    });

    function TaskProbe() {
      const session = useSession();
      const { addSignOutTask } = session;
      useEffect(() => addSignOutTask(task), [addSignOutTask]);
      return (
        <button
          type="button"
          onClick={() => {
            void session.signOut('revoked');
          }}
        >
          Salir
        </button>
      );
    }
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    renderWithIntl(
      <QueryClientProvider client={client}>
        <SessionProvider expected expiredNotice="Tu sesión ha caducado">
          <TaskProbe />
        </SessionProvider>
      </QueryClientProvider>,
    );
    await waitFor(() => {
      expect(firebase.listener).toBeDefined();
    });
    firebase.listener?.(user);

    await userEvent.click(screen.getByRole('button', { name: 'Salir' }));

    await waitFor(() => {
      expect(order).toEqual(['task:revoked', 'firebase']);
    });
  });
});
