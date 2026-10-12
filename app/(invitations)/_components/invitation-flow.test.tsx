import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';

import { pageNamespaces } from '@/app/lib/i18n/client-messages';
import { meResponseSchema, toAccount } from '@/app/lib/schemas/identity';
import type { ClaimRelationship } from '@/app/lib/schemas/invitations';

import { invitationTokens } from '@/tests/factories/invitations';
import { renderWithPageMessages } from '@/tests/render';

import {
  noSession,
  SessionContext,
  type Session,
} from '@/app/hooks/use-session';

import { InvitationFlow } from './invitation-flow';
import {
  buildMeResponse,
  buildNewAccountMeResponse,
  buildSpecialistMeResponse,
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

function signedIn(me = buildMeResponse()): Session {
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

function renderInvitation(
  token: string,
  session: Session = noSession,
  initialRelationship: ClaimRelationship | null = null,
) {
  return renderWithPageMessages(
    <QueryClientProvider client={new QueryClient()}>
      <SessionContext.Provider value={session}>
        <InvitationFlow
          token={token}
          initialRelationship={initialRelationship}
        />
      </SessionContext.Provider>
    </QueryClientProvider>,
    pageNamespaces.invitation,
  );
}

const claimButton = () => screen.getByRole('button', { name: 'Reclamar cita' });

describe('InvitationFlow', () => {
  it('shows a stranger the appointment and the way to sign in, keeping private data back', async () => {
    const { container } = renderInvitation(invitationTokens.pending);

    expect(
      await screen.findByRole('heading', { name: 'Dra. María González' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: 'Necesitas una cuenta para reclamarla',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Continuar con Google/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('jueves 22 de octubre de 2026', { exact: false }),
    ).toBeInTheDocument();
    expect(screen.getByText('Clínica Canaima')).toBeInTheDocument();
    expect(screen.getByText('$ 40 (USD)')).toBeInTheDocument();
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument();
    expect(screen.queryByText('V-12345678')).not.toBeInTheDocument();
    expect(screen.queryByText('Control pediátrico')).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('says a link leads nowhere when no invitation has its token', async () => {
    renderInvitation(invitationTokens.missing);
    expect(
      await screen.findByRole('heading', {
        name: 'Esta invitación no existe o el enlace es incorrecto',
      }),
    ).toBeInTheDocument();
  });

  it('says when an invitation is over, and shows nothing of it', async () => {
    renderInvitation(invitationTokens.expired);
    expect(
      await screen.findByRole('heading', { name: 'Esta invitación venció' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Clínica Canaima')).not.toBeInTheDocument();
  });

  it('tells another account that someone else claimed it', async () => {
    renderInvitation(invitationTokens.claimedByOther, signedIn());
    expect(
      await screen.findByRole('heading', {
        name: 'Esta invitación ya fue reclamada',
      }),
    ).toBeInTheDocument();
  });

  it('asks for whom it is, says which account keeps it, and claims it', async () => {
    const { container } = renderInvitation(
      invitationTokens.pending,
      signedIn(),
    );

    await userEvent.click(
      await screen.findByRole('button', { name: 'Reclamar cita' }),
    );
    expect(
      await screen.findByText('Elige para quién es la cita.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, node) =>
          node?.textContent === 'La cita quedará en tu cuenta ana@example.com.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('V-12345678')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();

    await userEvent.click(screen.getByRole('radio', { name: /Para mí/ }));
    await userEvent.click(claimButton());

    expect(
      await screen.findByRole('heading', {
        name: '¡Listo! La cita ya es tuya',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('La cita está vinculada a tu cuenta.'),
    ).toBeInTheDocument();
  });

  it('confirms in the same step when the window is open', async () => {
    renderInvitation(invitationTokens.confirmable, signedIn(), 'SELF');

    const confirm = await screen.findByRole('checkbox', {
      name: 'Confirmar mi asistencia',
    });
    expect(confirm).toBeChecked();
    expect(screen.getByRole('radio', { name: /Para mí/ })).toBeChecked();
    await userEvent.click(claimButton());

    expect(
      await screen.findByText(
        'La cita quedó vinculada a tu cuenta y tu asistencia está confirmada.',
      ),
    ).toBeInTheDocument();
  });

  it('explains a refused document and lets a representative claim it', async () => {
    renderInvitation(invitationTokens.mismatch, signedIn());

    await userEvent.click(
      await screen.findByRole('radio', { name: /Para mí/ }),
    );
    await userEvent.click(claimButton());

    const notice = await screen.findByRole('alert');
    expect(
      within(notice).getByText('No pudimos verificar que la cita sea tuya'),
    ).toBeInTheDocument();
    expect(
      within(notice).getByText(/La cédula de tu cuenta no es la del paciente/),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('radio', { name: /Para un tercero/ }),
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await userEvent.click(claimButton());

    expect(
      await screen.findByRole('heading', {
        name: '¡Listo! La cita ya es tuya',
      }),
    ).toBeInTheDocument();
  });

  it('claims one without a document for someone in one’s care, asking what it lacks', async () => {
    renderInvitation(invitationTokens.withoutDocument, signedIn());

    expect(
      await screen.findByText(/solo puedes reclamarla como representante/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('radio', { name: /Para mí/ }),
    ).not.toBeInTheDocument();

    await userEvent.click(claimButton());
    expect(await screen.findAllByText('Este campo es requerido.')).toHaveLength(
      2,
    );

    await userEvent.type(
      screen.getByLabelText('Fecha de nacimiento'),
      '2019-03-01',
    );
    await userEvent.click(screen.getByRole('radio', { name: 'Mujer' }));
    await userEvent.click(claimButton());

    expect(
      await screen.findByRole('heading', {
        name: '¡Listo! La cita ya es tuya',
      }),
    ).toBeInTheDocument();
  });

  it('sends an account with no sign-up to finish it first, keeping the answer', async () => {
    renderInvitation(
      invitationTokens.pending,
      signedIn(buildNewAccountMeResponse()),
    );

    await userEvent.click(
      await screen.findByRole('radio', { name: /Para mí/ }),
    );
    expect(
      screen.getByText('Para reclamar la cita solo falta completar tus datos.'),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(router.push).toHaveBeenCalledWith(
      `/sign-up?redirect=${encodeURIComponent(
        `/i/${invitationTokens.pending}?for=self`,
      )}`,
    );
  });

  it('keeps specialists out: invitations are for their patients', async () => {
    renderInvitation(
      invitationTokens.pending,
      signedIn(buildSpecialistMeResponse()),
    );
    expect(
      await screen.findByRole('heading', {
        name: 'Esta invitación es para tu paciente',
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Reclamar cita' }),
    ).not.toBeInTheDocument();
  });
});
