import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { meResponseSchema, toAccount } from '@/app/lib/schemas/identity';

import { announceNavigation } from '@/app/ui/motion/navigation-events';
import { renderWithIntl } from '@/tests/render';

import { SessionContext, type Session } from '@/app/hooks/use-session';

import { SessionButton } from './session-button';
import {
  buildMeResponse,
  buildSpecialistMeResponse,
} from '../../../tests/factories/identity';

const navigation = vi.hoisted(() => ({
  pathname: null as string | null,
  search: '',
}));
vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(navigation.search),
}));

afterEach(() => {
  navigation.pathname = null;
  navigation.search = '';
});

const user = {
  id: 'uid-1',
  email: 'ana@example.com',
  name: 'Ana Pérez',
  photo: null,
  provider: 'google' as const,
  getToken: () => Promise.resolve('token'),
};

function session(overrides: Partial<Session>): Session {
  return {
    status: 'signed-out',
    expected: false,
    user: null,
    account: null,
    accountStatus: 'idle',
    accountError: null,
    accountRetrying: false,
    retryAccount: vi.fn(),
    signOut: vi.fn(() => Promise.resolve()),
    addSignOutTask: () => () => undefined,
    firebaseReady: true,
    prepareSignIn: () => undefined,
    ...overrides,
  };
}

function renderWithSession(value: Session, ui: React.ReactElement) {
  return renderWithIntl(
    <SessionContext.Provider value={value}>{ui}</SessionContext.Provider>,
  );
}

describe('SessionButton', () => {
  it('offers «Entrar» to a stranger, with the way back', () => {
    renderWithSession(
      session({ status: 'signed-out' }),
      <SessionButton redirect="/panel" />,
    );

    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute(
      'href',
      '/sign-in?redirect=%2Fpanel',
    );
  });

  it('brings the person back with the page’s query, never with what was typed in a search', () => {
    navigation.pathname = '/search';
    navigation.search =
      'q=cardiologo&specialty=a0000000-0000-4000-8000-000000000001&origin=whatsapp-invitation';
    renderWithSession(session({ status: 'signed-out' }), <SessionButton />);

    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute(
      'href',
      `/sign-in?redirect=${encodeURIComponent('/search?specialty=a0000000-0000-4000-8000-000000000001')}`,
    );
  });

  it('offers nothing to a stranger where signing in is the page itself', () => {
    const { container } = renderWithSession(
      session({}),
      <SessionButton hideSignIn />,
    );

    expect(screen.queryByRole('link', { name: 'Entrar' })).toBeNull();
    expect(container).toBeEmptyDOMElement();
  });

  it('hides the account button on the sign-in page while /identity/me is still loading or has failed', () => {
    const loading = renderWithSession(
      session({ status: 'signed-in', user, accountStatus: 'loading' }),
      <SessionButton hideSignIn />,
    );
    expect(screen.queryByRole('button', { name: 'Tu cuenta' })).toBeNull();
    expect(loading.container).toBeEmptyDOMElement();
    loading.unmount();

    const failed = renderWithSession(
      session({ status: 'signed-in', user, accountStatus: 'error' }),
      <SessionButton hideSignIn />,
    );
    expect(screen.queryByRole('button', { name: 'Tu cuenta' })).toBeNull();
    expect(failed.container).toBeEmptyDOMElement();
  });

  it('offers «Entrar» at once when no session is expected', () => {
    renderWithSession(
      session({ status: 'resolving', expected: false }),
      <SessionButton />,
    );

    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute(
      'href',
      '/sign-in',
    );
  });

  it('holds the place while a likely session resolves', () => {
    const { container } = renderWithSession(
      session({ status: 'resolving', expected: true }),
      <SessionButton />,
    );

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(container.querySelector('[data-slot="skeleton"]')).not.toBeNull();
  });

  it('shows the account and lets it sign out', async () => {
    const value = session({
      status: 'signed-in',
      user,
      account: toAccount(meResponseSchema.parse(buildMeResponse())),
      accountStatus: 'ready',
    });
    const { container } = renderWithSession(
      value,
      <SessionButton layout="list" />,
    );

    expect(screen.getByText('Ana Pérez')).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Mi panel' }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Cerrar sesión' }),
    );
    expect(value.signOut).toHaveBeenCalledOnce();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('leads a patient to their appointments', () => {
    renderWithSession(
      session({
        status: 'signed-in',
        user,
        account: toAccount(meResponseSchema.parse(buildMeResponse())),
        accountStatus: 'ready',
      }),
      <SessionButton layout="list" />,
    );

    expect(screen.getByRole('link', { name: 'Mis citas' })).toHaveAttribute(
      'href',
      '/appointments',
    );
    expect(
      screen.queryByRole('link', { name: 'Mi panel' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Mi perfil' }),
    ).not.toBeInTheDocument();
  });

  it('leads a specialist to their panel and their profile', () => {
    renderWithSession(
      session({
        status: 'signed-in',
        user: { ...user, name: 'Dr. Luis Gómez' },
        account: toAccount(meResponseSchema.parse(buildSpecialistMeResponse())),
        accountStatus: 'ready',
      }),
      <SessionButton layout="list" />,
    );

    expect(screen.getByRole('link', { name: 'Mi panel' })).toHaveAttribute(
      'href',
      '/panel',
    );
    expect(screen.getByRole('link', { name: 'Mi perfil' })).toHaveAttribute(
      'href',
      '/panel/profile',
    );
    expect(
      screen.queryByRole('link', { name: 'Mis citas' }),
    ).not.toBeInTheDocument();
  });

  it('wears the avatar as the menu button in a bar', async () => {
    renderWithSession(
      session({ status: 'signed-in', user, accountStatus: 'loading' }),
      <SessionButton />,
    );

    // The menu's code comes for a signed-in person only.
    const trigger = await screen.findByRole('button', { name: 'Tu cuenta' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(screen.getByRole('img', { name: 'Ana Pérez' })).toHaveTextContent(
      'AP',
    );
  });

  it('signs out from the bar with the menu still open, for the colour to cover', async () => {
    const value = session({
      status: 'signed-in',
      user,
      account: toAccount(meResponseSchema.parse(buildMeResponse())),
      accountStatus: 'ready',
    });
    renderWithSession(value, <SessionButton />);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Tu cuenta' }),
    );
    await userEvent.click(
      await screen.findByRole('menuitem', { name: 'Cerrar sesión' }),
    );

    expect(value.signOut).toHaveBeenCalledOnce();
    // The blue wipe grows from the item: the menu goes with the session,
    // under the colour, instead of shrinking where the colour starts.
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('waits past 600ms for /sign-in to land when signing out from /panel', async () => {
    vi.useFakeTimers();
    try {
      navigation.pathname = '/panel';
      let wipeSettled = false;
      const wipeModule = await import('@/app/ui/motion/screen-wipe');
      const spy = vi
        .spyOn(wipeModule, 'wipeScreen')
        .mockImplementation(async ({ whileCovered }) => {
          await whileCovered();
          wipeSettled = true;
        });

      const value = session({
        status: 'signed-in',
        user,
        accountStatus: 'error',
      });
      renderWithSession(value, <SessionButton layout="list" />);

      screen.getByRole('button', { name: 'Cerrar sesión' }).click();
      await vi.advanceTimersByTimeAsync(1500);
      // Cold serverless `/sign-in` has not landed yet at 1.5s: still covered.
      expect(wipeSettled).toBe(false);

      announceNavigation();
      await vi.advanceTimersByTimeAsync(0);
      expect(wipeSettled).toBe(true);
      spy.mockRestore();
    } finally {
      vi.useRealTimers();
    }
  });
});
