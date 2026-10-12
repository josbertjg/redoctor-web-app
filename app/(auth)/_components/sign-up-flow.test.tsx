import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { meResponseSchema, toAccount } from '@/app/lib/schemas/identity';

import { renderWithIntl } from '@/tests/render';

import { SessionContext, type Session } from '@/app/hooks/use-session';

import { SignUpFlow } from './sign-up-flow';
import {
  buildMeResponse,
  buildNewAccountMeResponse,
  buildSpecialistMeResponse,
  specialistFacet,
} from '../../../tests/factories/identity';
import { validToken } from '../../../tests/msw/handlers/identity';

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const user = {
  id: 'uid-1',
  email: 'ana@example.com',
  name: 'Ana Pérez',
  photo: null,
  provider: 'google' as const,
  getToken: () => Promise.resolve(validToken),
};

function session(me: Parameters<typeof meResponseSchema.parse>[0]): Session {
  return {
    status: 'signed-in',
    expected: true,
    user,
    account: toAccount(meResponseSchema.parse(me)),
    accountStatus: 'ready',
    accountError: null,
    retryAccount: vi.fn(),
    signOut: vi.fn(() => Promise.resolve()),
  };
}

function renderFlow(value: Session, redirect: string | null = null) {
  return renderWithIntl(
    <QueryClientProvider client={new QueryClient()}>
      <SessionContext.Provider value={value}>
        <SignUpFlow
          redirect={redirect}
          joinApp={<p>Ir a la app (nuevo)</p>}
          finishApp={<p>Termina en la app</p>}
        />
      </SessionContext.Provider>
    </QueryClientProvider>,
  );
}

describe('SignUpFlow', () => {
  it('asks a brand-new account who it is, and signs a patient up', async () => {
    renderFlow(session(buildNewAccountMeResponse()));

    expect(
      screen.getByRole('heading', { name: '¿Quién eres?' }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Paciente/ }));

    expect(
      screen.getByRole('heading', { name: 'Crea tu cuenta de paciente' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Nombre' })).toBeInTheDocument();
  });

  it('sends a specialist to the app, with a way back', async () => {
    renderFlow(session(buildNewAccountMeResponse()));

    await userEvent.click(screen.getByRole('button', { name: /Especialista/ }));
    expect(screen.getByText('Ir a la app (nuevo)')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(
      screen.getByRole('heading', { name: '¿Quién eres?' }),
    ).toBeInTheDocument();
  });

  it('asks everything on one screen to claim an invitation', () => {
    renderFlow(session(buildNewAccountMeResponse()), '/i/tok');

    expect(
      screen.getByRole('heading', {
        name: 'Crea tu cuenta para reclamar tu cita',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Nombre' })).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: 'Cédula de identidad' }),
    ).toBeInTheDocument();
  });

  it('shows an open specialist sign-up the way to the app', () => {
    renderFlow(
      session(
        buildSpecialistMeResponse({
          registrationStatus: 'PENDING_KYC',
          profiles: {
            patient: { exists: false },
            specialist: specialistFacet({ status: 'PENDING_KYC' }),
          },
        }),
      ),
    );

    expect(screen.getByText('Termina en la app')).toBeInTheDocument();
  });

  it('moves a complete account on to where it was going', () => {
    renderFlow(session(buildMeResponse()), '/a/abc');

    expect(router.replace).toHaveBeenCalledWith('/a/abc');
  });

  it('warns whoever arrived with Apple’s private email', () => {
    renderWithIntl(
      <QueryClientProvider client={new QueryClient()}>
        <SessionContext.Provider
          value={{
            ...session(buildNewAccountMeResponse()),
            user: { ...user, email: 'x1@privaterelay.appleid.com' },
          }}
        >
          <SignUpFlow redirect={null} joinApp={null} finishApp={null} />
        </SessionContext.Provider>
      </QueryClientProvider>,
    );

    expect(
      screen.getByText(/Entraste con un correo privado de Apple/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Entrar con otra cuenta' }),
    ).toBeInTheDocument();
  });
});
