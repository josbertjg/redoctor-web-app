import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { meResponseSchema, toAccount } from '@/app/lib/schemas/identity';

import { renderWithIntl } from '@/tests/render';

import { SessionContext, type Session } from '@/app/hooks/use-session';

import { RequireSession } from './require-session';
import {
  buildMeResponse,
  buildSpecialistMeResponse,
} from '../../../tests/factories/identity';

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/panel',
}));

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
    retryAccount: vi.fn(),
    signOut: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
}

function renderGuard(value: Session, facet?: 'patient' | 'specialist') {
  return renderWithIntl(
    <SessionContext.Provider value={value}>
      <RequireSession {...(facet ? { facet } : {})} fallback={<p>Esqueleto</p>}>
        <p>Contenido privado</p>
      </RequireSession>
    </SessionContext.Provider>,
  );
}

describe('RequireSession', () => {
  it('sends a stranger to sign in, with the way back, and shows the skeleton meanwhile', () => {
    renderGuard(session({ status: 'signed-out' }));

    expect(screen.getByText('Esqueleto')).toBeInTheDocument();
    expect(router.replace).toHaveBeenCalledWith('/sign-in?redirect=%2Fpanel');
  });

  it('shows the skeleton until the person is known', () => {
    renderGuard(session({ status: 'resolving', expected: true }));
    expect(screen.getByText('Esqueleto')).toBeInTheDocument();

    renderGuard(
      session({ status: 'signed-in', user, accountStatus: 'loading' }),
    );
    expect(screen.getAllByText('Esqueleto')).toHaveLength(2);
    expect(screen.queryByText('Contenido privado')).not.toBeInTheDocument();
  });

  it('lets the account retry when the API could not answer', async () => {
    const value = session({
      status: 'signed-in',
      user,
      accountStatus: 'error',
      accountError: new Error('boom'),
    });
    renderGuard(value);

    expect(
      screen.getByRole('heading', { name: 'No pudimos leer tu cuenta' }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(value.retryAccount).toHaveBeenCalledOnce();
  });

  it('keeps a patient out of the specialist area, with a way out', () => {
    renderGuard(
      session({
        status: 'signed-in',
        user,
        account: toAccount(meResponseSchema.parse(buildMeResponse())),
        accountStatus: 'ready',
      }),
      'specialist',
    );

    expect(
      screen.getByRole('heading', {
        name: 'Esta página es para especialistas',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir al inicio' })).toHaveAttribute(
      'href',
      '/',
    );
    expect(screen.queryByText('Contenido privado')).not.toBeInTheDocument();
  });

  it('lets the right facet in', () => {
    renderGuard(
      session({
        status: 'signed-in',
        user,
        account: toAccount(meResponseSchema.parse(buildSpecialistMeResponse())),
        accountStatus: 'ready',
      }),
      'specialist',
    );

    expect(screen.getByText('Contenido privado')).toBeInTheDocument();
  });
});
