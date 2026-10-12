import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getSessionToken } from '@/app/lib/auth/token';
import type { SessionUser } from '@/app/lib/firebase/client';

import { renderWithIntl } from '@/tests/render';

import { useSession } from '@/app/hooks/use-session';

import { SessionProvider } from './session-provider';
import { validToken } from '../../../tests/msw/handlers/identity';

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
      <button
        type="button"
        onClick={() => {
          void session.signOut();
        }}
      >
        Salir
      </button>
    </div>
  );
}

function renderProvider(expected = false) {
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
});

describe('SessionProvider', () => {
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
    await expect(getSessionToken()).resolves.toBe(validToken);
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
});
