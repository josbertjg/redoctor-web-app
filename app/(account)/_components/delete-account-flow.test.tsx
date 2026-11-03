import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { meResponseSchema, toAccount } from '@/app/lib/schemas/identity';

import {
  buildMeResponse,
  buildSpecialistMeResponse,
} from '@/tests/factories/identity';
import { apiUrl, errorEnvelope } from '@/tests/msw/api-url';
import { validToken } from '@/tests/msw/handlers/identity';
import { server } from '@/tests/msw/server';
import { renderWithIntl } from '@/tests/render';

import { SessionContext, type Session } from '@/app/hooks/use-session';

import {
  DeleteAccountFlow,
  type DeleteAccountWords,
} from './delete-account-flow';

const firebase = vi.hoisted(() => ({
  reauthenticate: vi.fn(),
  revokeAppleAccess: vi.fn(),
}));
vi.mock('@/app/lib/firebase/client', () => firebase);

const words: DeleteAccountWords = {
  title: 'Tu cuenta',
  signIn: 'Para eliminar tu cuenta, entra con la cuenta que usas en Redoctor.',
  admin: 'Tu cuenta es de administrador: no se elimina desde aquí.',
  intro: 'Tu cuenta se borra en el acto y no se puede deshacer.',
  deletedTitle: 'Qué se borra',
  cancelledTitle: 'Qué se cancela',
  keptTitle: 'Qué se conserva, sin tus datos personales',
  patient: {
    personal: 'Tus datos personales y tu foto.',
    relatives: 'Tus familiares, tus favoritos y las notas de tus citas.',
    writtenReviews: 'Las reseñas que escribiste.',
    devices: 'Tus avisos y el acceso desde todos tus teléfonos.',
    appointments: 'Tus citas futuras.',
    appointmentRecord: 'El registro de cada cita atendida.',
  },
  specialist: {
    personal: 'Tus datos y tu verificación de identidad.',
    profile: 'Tu perfil profesional.',
    offices: 'Tus consultorios.',
    credentials: 'Tus especialidades.',
    receivedReviews: 'Las reseñas que recibiste.',
    devices: 'Tus avisos.',
    appointments: 'Tus citas futuras y tus invitaciones.',
    subscription: 'Tu suscripción, sin reembolso.',
    balance: 'Tu saldo a favor.',
    appointmentRecord: 'El registro de las citas que atendiste.',
    payments: 'Tus pagos y recibos.',
  },
  emailFree: 'Tu correo queda libre.',
  reauthNote: {
    google: 'Te pediremos que entres de nuevo con Google.',
    apple: 'Te pediremos que entres de nuevo con Apple.',
  },
  button: 'Eliminar mi cuenta',
  deleted: 'Tu cuenta se eliminó.',
  wrongAccount: 'Entra con la misma cuenta con la que usas Redoctor.',
  appleRevokeFailed: 'No pudimos retirar el permiso de Apple.',
  failed: 'No pudimos eliminar tu cuenta.',
  noProvider: 'Escríbenos y la eliminamos por ti.',
};

function session(
  overrides: Partial<Session> & { provider?: 'google' | 'apple' } = {},
): Session {
  const { provider = 'google', ...rest } = overrides;
  return {
    status: 'signed-in',
    expected: true,
    user: {
      id: 'uid-1',
      email: 'ana@example.com',
      name: 'Ana Pérez',
      photo: null,
      provider,
      getToken: () => Promise.resolve(validToken),
    },
    account: toAccount(meResponseSchema.parse(buildMeResponse())),
    accountStatus: 'ready',
    accountError: null,
    accountRetrying: false,
    retryAccount: vi.fn(),
    signOut: vi.fn(() => Promise.resolve()),
    addSignOutTask: () => () => undefined,
    firebaseReady: true,
    prepareSignIn: () => undefined,
    ...rest,
  };
}

function renderFlow(value: Session) {
  return renderWithIntl(
    <QueryClientProvider client={new QueryClient()}>
      <SessionContext.Provider value={value}>
        <main>
          <DeleteAccountFlow words={words} />
        </main>
      </SessionContext.Provider>
    </QueryClientProvider>,
  );
}

/** Whether the API was asked to delete the account. */
function recordDeletes() {
  const deletes: string[] = [];
  server.events.on('request:start', ({ request }) => {
    if (request.method === 'DELETE' && request.url.endsWith('/identity/me')) {
      deletes.push(request.url);
    }
  });
  return deletes;
}

describe('DeleteAccountFlow (REDOC-352)', () => {
  it('asks a stranger to sign in with the account to delete', () => {
    renderFlow({
      ...session(),
      status: 'signed-out',
      user: null,
      account: null,
    });

    expect(
      screen.getByText(
        'Para eliminar tu cuenta, entra con la cuenta que usas en Redoctor.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Eliminar mi cuenta/ }),
    ).not.toBeInTheDocument();
  });

  it('tells a patient what happens to each thing, then deletes the account after signing in again', async () => {
    const deletes = recordDeletes();
    firebase.reauthenticate.mockResolvedValue({
      status: 'confirmed',
      appleAccessToken: null,
    });
    const value = session();
    const { container } = renderFlow(value);

    expect(screen.getByText('Las reseñas que escribiste.')).toBeInTheDocument();
    expect(screen.getByText('Tus citas futuras.')).toBeInTheDocument();
    expect(
      screen.getByText('Te pediremos que entres de nuevo con Google.'),
    ).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();

    await userEvent.click(
      screen.getByRole('button', { name: /Eliminar mi cuenta/ }),
    );

    expect(
      await screen.findByText('Tu cuenta se eliminó.'),
    ).toBeInTheDocument();
    expect(firebase.reauthenticate).toHaveBeenCalledWith('google');
    expect(deletes).toHaveLength(1);
    expect(value.signOut).toHaveBeenCalledWith('user');
  });

  it('withdraws Apple’s permission before deleting a specialist’s Apple account', async () => {
    const deletes = recordDeletes();
    firebase.reauthenticate.mockResolvedValue({
      status: 'confirmed',
      appleAccessToken: 'apple-access-token',
    });
    firebase.revokeAppleAccess.mockResolvedValue(undefined);
    renderFlow(
      session({
        provider: 'apple',
        account: toAccount(meResponseSchema.parse(buildSpecialistMeResponse())),
      }),
    );

    expect(
      screen.getByText('Tu suscripción, sin reembolso.'),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: /Eliminar mi cuenta/ }),
    );

    expect(
      await screen.findByText('Tu cuenta se eliminó.'),
    ).toBeInTheDocument();
    expect(firebase.revokeAppleAccess).toHaveBeenCalledWith(
      'apple-access-token',
    );
    expect(deletes).toHaveLength(1);
  });

  it('deletes nothing when Apple’s permission cannot be withdrawn', async () => {
    const deletes = recordDeletes();
    firebase.reauthenticate.mockResolvedValue({
      status: 'confirmed',
      appleAccessToken: 'apple-access-token',
    });
    firebase.revokeAppleAccess.mockRejectedValue(new Error('offline'));
    renderFlow(session({ provider: 'apple' }));

    await userEvent.click(
      screen.getByRole('button', { name: /Eliminar mi cuenta/ }),
    );

    expect(
      await screen.findByText('No pudimos retirar el permiso de Apple.'),
    ).toBeInTheDocument();
    expect(deletes).toHaveLength(0);
  });

  it('deletes nothing when another account comes back from the provider', async () => {
    const deletes = recordDeletes();
    firebase.reauthenticate.mockResolvedValue({ status: 'wrong-account' });
    renderFlow(session());

    await userEvent.click(
      screen.getByRole('button', { name: /Eliminar mi cuenta/ }),
    );

    expect(
      await screen.findByText(
        'Entra con la misma cuenta con la que usas Redoctor.',
      ),
    ).toBeInTheDocument();
    expect(deletes).toHaveLength(0);
  });

  it('says it when the API refuses an admin’s own deletion', async () => {
    firebase.reauthenticate.mockResolvedValue({
      status: 'confirmed',
      appleAccessToken: null,
    });
    server.use(
      http.delete(apiUrl('/identity/me'), () =>
        HttpResponse.json(errorEnvelope('ERR_2019', 'Self deletion'), {
          status: 403,
        }),
      ),
    );
    renderFlow(session());

    await userEvent.click(
      screen.getByRole('button', { name: /Eliminar mi cuenta/ }),
    );
    await waitFor(() => {
      expect(
        screen.getByText(
          'Tu cuenta es de administrador: no se elimina desde aquí.',
        ),
      ).toBeInTheDocument();
    });
  });
});
