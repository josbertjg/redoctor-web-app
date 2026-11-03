import { screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';

import { pageNamespaces } from '@/app/lib/i18n/client-messages';

import { renderWithPageMessages } from '@/tests/render';

import { SessionContext, type Session } from '@/app/hooks/use-session';

import { SignInCard } from './sign-in-card';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/sign-in',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/app/lib/firebase/client', () => ({ signInWith: vi.fn() }));

const stranger: Session = {
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
};

function renderCard(redirect: string | null) {
  return renderWithPageMessages(
    <SessionContext.Provider value={stranger}>
      <SignInCard redirect={redirect} />
    </SessionContext.Provider>,
    pageNamespaces.signIn,
  );
}

describe('SignInCard', () => {
  it('offers both providers and the way to sign up, keeping the way back', async () => {
    const { container } = renderCard('/a/1');

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Inicia sesión de manera rápida y segura',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Continuar con Google' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Continuar con Apple' }),
    ).toBeInTheDocument();
    expect(screen.getByText('¿Aún no tienes una cuenta?')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Regístrate' })).toHaveAttribute(
      'href',
      '/sign-up?redirect=%2Fa%2F1',
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('leads to the sign-up alone when there is nowhere to return', () => {
    renderCard(null);

    expect(screen.getByRole('link', { name: 'Regístrate' })).toHaveAttribute(
      'href',
      '/sign-up',
    );
  });
});
