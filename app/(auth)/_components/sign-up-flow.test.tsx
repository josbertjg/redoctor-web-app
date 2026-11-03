import { useEffect, useState } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

const router = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
  listeners: new Set<() => void>(),
}));
const wipe = vi.hoisted(() => ({
  covered: null as (() => unknown) | null,
}));
vi.mock('@/app/ui/motion/screen-wipe', () => ({
  // The colour stays on screen until a test runs what happens under it.
  wipeScreen: ({ whileCovered }: { whileCovered: () => unknown }) => {
    wipe.covered = whileCovered;
    return new Promise<void>(() => undefined);
  },
}));
vi.mock('next/navigation', async () => {
  const { useSyncExternalStore } = await import('react');
  const subscribe = (listener: () => void) => {
    router.listeners.add(listener);
    return () => {
      router.listeners.delete(listener);
    };
  };
  return {
    useRouter: () => ({ replace: router.replace, push: router.push }),
    usePathname: () => window.location.pathname,
    // Next.js keeps useSearchParams in step with pushState: so does the mock.
    useSearchParams: () =>
      new URLSearchParams(
        useSyncExternalStore(subscribe, () => window.location.search),
      ),
  };
});
vi.mock('@/app/lib/firebase/client', () => ({ signInWith: vi.fn() }));

// The browser's own, kept before any spy replaces it.
const pushState = History.prototype.pushState.bind(window.history);

beforeEach(() => {
  wipe.covered = null;
  window.history.replaceState(null, '', '/sign-up');
  vi.spyOn(window.history, 'pushState').mockImplementation((...args) => {
    pushState(...args);
    router.listeners.forEach((listener) => {
      listener();
    });
  });
});

const user = {
  id: 'uid-1',
  email: 'ana@example.com',
  name: 'Ana Pérez',
  photo: null,
  provider: 'google' as const,
  getToken: () => Promise.resolve(validToken),
};

const isEqual = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

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
    addSignOutTask: () => () => undefined,
    firebaseReady: true,
    prepareSignIn: () => undefined,
  };
}

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

function renderFlow(value: Session, redirect: string | null = null) {
  return renderWithIntl(
    <QueryClientProvider client={new QueryClient()}>
      <SessionContext.Provider value={value}>
        <SignUpFlow
          redirect={redirect}
          finishApp={<p>Termina en la app</p>}
          createdApp={<p>Cuenta creada: sigue en la app</p>}
        />
      </SessionContext.Provider>
    </QueryClientProvider>,
  );
}

/** Lets a test change the session from outside, as Firebase and `/me` do. */
const arrival = { now: (): void => undefined };

function SessionThatArrives({
  first,
  then,
}: {
  first: Session;
  then: Session;
}) {
  const [value, setValue] = useState(first);
  useEffect(() => {
    arrival.now = () => {
      setValue(then);
    };
  }, [then]);
  return (
    <SessionContext.Provider value={value}>
      <SignUpFlow redirect={null} finishApp={null} createdApp={null} />
    </SessionContext.Provider>
  );
}

describe('SignUpFlow', () => {
  it('keeps the browser’s focus when the account arrives: only a step moves it', () => {
    const ready = session(buildNewAccountMeResponse());
    renderWithIntl(
      <QueryClientProvider client={new QueryClient()}>
        <SessionThatArrives
          first={{ ...ready, account: null, accountStatus: 'loading' }}
          then={ready}
        />
      </QueryClientProvider>,
    );
    expect(screen.queryByRole('heading')).toBeNull();

    act(() => {
      arrival.now();
    });

    expect(
      screen.getByRole('heading', { name: '¿Quién eres?' }),
    ).not.toHaveFocus();
    expect(document.body).toHaveFocus();
  });

  it('a stranger chooses who they are, then creates the account in place', async () => {
    renderFlow(stranger);

    expect(
      screen.getByRole('heading', { level: 1, name: '¿Quién eres?' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Inicia sesión' })).toHaveAttribute(
      'href',
      '/sign-in',
    );
    await userEvent.click(screen.getByRole('button', { name: /Especialista/ }));

    expect(window.location.search).toBe('?as=specialist');
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Crea tu cuenta como especialista',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Continuar con Google' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Continuar con Apple' }),
    ).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('keeps the role in the address, and goes back to the roles', async () => {
    window.history.replaceState(null, '', '/sign-up?as=patient');
    renderFlow(stranger);

    expect(
      screen.getByRole('heading', { name: 'Crea tu cuenta como paciente' }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Volver' }));

    expect(window.location.search).toBe('');
    expect(
      screen.getByRole('heading', { name: '¿Quién eres?' }),
    ).toBeInTheDocument();
  });

  it('a stranger from an invitation creates a patient account in place', () => {
    renderFlow(stranger, '/i/tok');

    expect(
      screen.getByRole('heading', { name: 'Crea tu cuenta como paciente' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Volver' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Inicia sesión' })).toHaveAttribute(
      'href',
      '/sign-in?redirect=%2Fi%2Ftok',
    );
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('asks a brand-new account who it is, and signs a patient up', async () => {
    renderFlow(session(buildNewAccountMeResponse()));

    expect(
      screen.getByRole('heading', { name: '¿Quién eres?' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Inicia sesión' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /Paciente/ }));

    expect(window.location.search).toBe('?as=patient');
    expect(
      screen.getByRole('heading', { name: 'Crea tu cuenta como paciente' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Nombre' })).toBeInTheDocument();
  });

  it('a brand-new specialist fills the form and is handed to the app', async () => {
    window.history.replaceState(null, '', '/sign-up?as=specialist');
    renderFlow(session(buildNewAccountMeResponse()));

    expect(
      screen.getByRole('heading', { name: 'Crea tu cuenta como especialista' }),
    ).toBeInTheDocument();
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Nombre' }),
      'Luis',
    );
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Apellido' }),
      'Gómez',
    );
    await userEvent.type(
      screen.getByLabelText('Fecha de nacimiento'),
      '1985-03-02',
    );
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Cédula de identidad' }),
      '12345678',
    );
    await userEvent.click(screen.getByRole('radio', { name: 'Hombre' }));
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Teléfono' }),
      '04141234567',
    );
    await userEvent.click(screen.getByRole('checkbox', { name: /He leído/ }));
    await userEvent.click(screen.getByRole('checkbox', { name: /Autorizo/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    await waitFor(() => {
      expect(wipe.covered).not.toBeNull();
    });
    await act(async () => {
      await wipe.covered?.();
    });

    expect(
      screen.getByText('Cuenta creada: sigue en la app'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a mi panel' })).toHaveAttribute(
      'href',
      '/panel',
    );
    expect(router.replace).not.toHaveBeenCalled();
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

  it('asks the same to book, in the booking’s words', () => {
    renderFlow(session(buildNewAccountMeResponse()), '/book/abc');
    expect(
      screen.getByRole('heading', {
        name: 'Crea tu cuenta para agendar tu cita',
      }),
    ).toBeInTheDocument();
  });

  it('asks a registered patient only the personal data to book', () => {
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
      '/book/abc',
    );
    expect(
      screen.getByRole('heading', { name: 'Finalizar registro' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Para agendar tu cita solo falta completar tus datos.'),
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

  it('ends under the colour: «¡Todo listo!» first, then the account read again', async () => {
    const readAgain = vi.spyOn(QueryClient.prototype, 'invalidateQueries');
    const accountReadAgain = () =>
      readAgain.mock.calls.some(([filters]) =>
        isEqual(filters?.queryKey, ['identity', 'me', user.id]),
      );
    renderFlow(
      session(buildNewAccountMeResponse()),
      `/i/${invitationTokens.pending}?for=dependent`,
    );

    await userEvent.type(
      screen.getByRole('textbox', { name: 'Nombre' }),
      'Ana',
    );
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Apellido' }),
      'Pérez',
    );
    await userEvent.type(
      screen.getByLabelText('Fecha de nacimiento'),
      '1990-01-15',
    );
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Teléfono' }),
      '0414-123.45.67',
    );
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Cédula de identidad' }),
      '12.345.678',
    );
    await userEvent.click(screen.getByRole('radio', { name: 'Mujer' }));
    await userEvent.click(screen.getByRole('checkbox', { name: /He leído/ }));
    await userEvent.click(screen.getByRole('checkbox', { name: /Autorizo/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Finalizar' }));

    // Saved, and the colour on its way: the page holds still, its button
    // busy, and nothing yet reads the account — a fresh one before the end
    // would move the page away.
    await waitFor(() => {
      expect(wipe.covered).not.toBeNull();
    });
    expect(screen.getByRole('button', { name: 'Finalizar' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(accountReadAgain()).toBe(false);
    expect(router.replace).not.toHaveBeenCalled();

    await act(async () => {
      await wipe.covered?.();
    });

    expect(
      screen.getByRole('heading', { name: '¡Todo listo!' }),
    ).toBeInTheDocument();
    expect(accountReadAgain()).toBe(true);
    expect(router.replace).not.toHaveBeenCalled();
    readAgain.mockRestore();
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
          <SignUpFlow redirect={null} finishApp={null} createdApp={null} />
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
