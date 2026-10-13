import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';

import { meResponseSchema, toAccount } from '@/app/lib/schemas/identity';

import { renderWithIntl } from '@/tests/render';

import { SessionContext, type Session } from '@/app/hooks/use-session';

import { SessionButton } from './session-button';
import {
  buildMeResponse,
  buildSpecialistMeResponse,
} from '../../../tests/factories/identity';

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
  });

  it('leads a specialist to their page', () => {
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
    expect(
      screen.queryByRole('link', { name: 'Mis citas' }),
    ).not.toBeInTheDocument();
  });

  it('wears the avatar as the menu button in a bar', () => {
    renderWithSession(
      session({ status: 'signed-in', user, accountStatus: 'loading' }),
      <SessionButton />,
    );

    const trigger = screen.getByRole('button', { name: 'Tu cuenta' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(screen.getByRole('img', { name: 'Ana Pérez' })).toHaveTextContent(
      'AP',
    );
  });
});
