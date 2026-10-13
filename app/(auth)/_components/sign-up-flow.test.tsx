import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { meResponseSchema, toAccount } from '@/app/lib/schemas/identity';

import { invitationTokens } from '@/tests/factories/invitations';
import { renderWithIntl } from '@/tests/render';

import { SessionContext, type Session } from '@/app/hooks/use-session';

import { SignUpFlow } from './sign-up-flow';
import {
  buildMeResponse,
  buildNewAccountMeResponse,
  buildSpecialistMeResponse,
  patientFacet,
  specialistFacet,
} from '../../../tests/factories/identity';
import { validToken } from '../../../tests/msw/handlers/identity';

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/sign-up',
}));

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
    accountRetrying: false,
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

  it('starts from the invitation’s data when the appointment is theirs', async () => {
    renderFlow(
      session(
        buildMeResponse({
          registrationStatus: 'PENDING_COMPLETE_PATIENT',
          profiles: {
            patient: patientFacet({ status: 'PENDING_PERSONAL_DATA' }),
            specialist: { exists: false },
          },
        }),
      ),
      `/i/${invitationTokens.pending}?for=self`,
    );

    expect(
      await screen.findByText(
        'Para reclamar la cita solo falta completar tus datos. Ya pusimos los de la invitación: revísalos antes de seguir.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Fecha de nacimiento')).toHaveValue(
      '1990-05-14',
    );
    expect(screen.getByRole('textbox', { name: 'Teléfono' })).toHaveValue(
      '414 123 4567',
    );
    expect(
      screen.getByRole('textbox', { name: 'Cédula de identidad' }),
    ).toHaveValue('12345678');
    expect(screen.getByRole('radio', { name: 'Mujer' })).toBeChecked();
  });

  it('never fills someone else’s data in a representative’s sign-up', () => {
    renderFlow(
      session(buildNewAccountMeResponse()),
      `/i/${invitationTokens.pending}?for=dependent`,
    );

    expect(
      screen.getByRole('textbox', { name: 'Cédula de identidad' }),
    ).toHaveValue('');
    expect(
      screen.getByText('Para reclamar la cita solo falta completar tus datos.'),
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
