import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { yearsBefore, todayInCaracas } from '@/app/lib/format/date-of-birth';
import { pageNamespaces } from '@/app/lib/i18n/client-messages';
import { meResponseSchema, toAccount } from '@/app/lib/schemas/identity';

import {
  buildAppointment,
  officeId,
  takenStartTime,
} from '@/tests/factories/appointments';
import { bookingIds } from '@/tests/factories/booking';
import {
  buildMeResponse,
  buildSpecialistMeResponse,
  patientFacet,
} from '@/tests/factories/identity';
import { knownSpecialistId } from '@/tests/factories/specialists';
import { renderWithPageMessages } from '@/tests/render';

import {
  noSession,
  SessionContext,
  type Session,
} from '@/app/hooks/use-session';

import { BookingFlow } from './booking-flow';
import { apiUrl } from '../../../../tests/msw/api-url';
import { validToken } from '../../../../tests/msw/handlers/identity';
import { server } from '../../../../tests/msw/server';

import type { BookingSpecialist } from './booking-types';

const navigation = vi.hoisted(() => ({
  push: vi.fn(),
  listeners: new Set<() => void>(),
}));

vi.mock('next/navigation', async () => {
  const { useSyncExternalStore } = await import('react');
  const subscribe = (listener: () => void) => {
    navigation.listeners.add(listener);
    return () => {
      navigation.listeners.delete(listener);
    };
  };
  return {
    useRouter: () => ({ push: navigation.push, replace: vi.fn() }),
    usePathname: () => window.location.pathname,
    // Next.js keeps useSearchParams in step with pushState: so does the mock.
    useSearchParams: () =>
      new URLSearchParams(
        useSyncExternalStore(subscribe, () => window.location.search),
      ),
  };
});

// The browser's own, kept before any spy replaces it.
const pushState = History.prototype.pushState.bind(window.history);

beforeEach(() => {
  window.history.replaceState(null, '', `/book/${knownSpecialistId}`);
  vi.spyOn(window.history, 'pushState').mockImplementation((...args) => {
    pushState(...args);
    navigation.listeners.forEach((listener) => {
      listener();
    });
  });
});

const secondOffice = 'b1b2b3b4-0000-4000-8000-000000000002';

const specialist: BookingSpecialist = {
  id: knownSpecialistId,
  name: 'Ana Pérez',
  photoUrl: null,
  verified: true,
  specialties: ['Medicina Interna'],
  offices: [
    {
      id: officeId,
      name: 'Clínica El Ávila',
      address: 'Av. San Juan Bosco, Altamira, Caracas',
      description: 'Piso 6, consultorio 604',
    },
    {
      id: secondOffice,
      name: 'Centro Médico La Floresta',
      address: 'Av. Principal de La Floresta, Caracas',
      description: null,
    },
  ],
};

const sessionUser = {
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
    user: sessionUser,
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

type RenderOptions = {
  session?: Session;
  who?: BookingSpecialist;
  specialtyId?: string | null;
};

function renderBooking({
  session = signedIn(),
  who = specialist,
  specialtyId = bookingIds.internalMedicine,
}: RenderOptions = {}) {
  return renderWithPageMessages(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <SessionContext.Provider value={session}>
        <BookingFlow
          specialist={who}
          specialtyId={specialtyId}
          ownerNotice={{
            title: 'Es una vista previa',
            description: 'Aquí tus pacientes agendan su cita contigo.',
          }}
        />
      </SessionContext.Provider>
    </QueryClientProvider>,
    pageNamespaces.book,
  );
}

/** Whatever `POST /scheduling/appointments` received, answered as the API does. */
function captureBooking() {
  const sent: { body: Record<string, unknown> | null } = { body: null };
  server.use(
    http.post(apiUrl('/scheduling/appointments'), async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      sent.body = body;
      if (body.startTime === takenStartTime) {
        return HttpResponse.json(
          { code: 'ERR_4002', message: 'Slot taken' },
          { status: 409 },
        );
      }
      return HttpResponse.json(
        {
          appointment: buildAppointment({
            id: bookingIds.booked,
            specialistId: knownSpecialistId,
            specialistName: 'Ana Pérez',
          }),
        },
        { status: 201 },
      );
    }),
  );
  return sent;
}

const heading = (name: string) =>
  screen.findByRole('heading', { level: 2, name });

const next = () =>
  userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

/** Through the office and the slot, onto «Paciente». */
async function toPatientStep(hour = /8:30/) {
  await heading('Selecciona un consultorio');
  await next();
  await heading('Fecha y hora');
  await userEvent.click(await screen.findByRole('radio', { name: hour }));
  await next();
  await heading('Paciente');
  await userEvent.click(
    await screen.findByRole('radio', { name: /Consulta general/ }),
  );
}

describe('booking from a profile', () => {
  it('asks a visitor to sign in right there', async () => {
    renderBooking({ session: noSession });

    expect(
      await screen.findByRole('heading', {
        name: 'Entra para agendar tu cita',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Google/ })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Agendar cita' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Perfil del especialista' }),
    ).toHaveAttribute('href', `/s/${knownSpecialistId}`);
  });

  it('books nothing with a specialist’s account, and shows its owner the app’s preview', async () => {
    renderBooking({ session: signedIn(buildSpecialistMeResponse()) });
    expect(
      await screen.findByRole('heading', { name: 'Agendar es para pacientes' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a mi panel' })).toHaveAttribute(
      'href',
      '/panel',
    );
  });

  it('shows its owner the app’s preview notice', async () => {
    renderBooking({
      session: signedIn(buildSpecialistMeResponse()),
      who: { ...specialist, id: 'specialist-1' },
    });
    expect(
      await screen.findByRole('heading', { name: 'Es una vista previa' }),
    ).toBeInTheDocument();
  });

  it('sends a patient with an unfinished sign-up to finish it, and back', async () => {
    window.history.replaceState(
      null,
      '',
      `/book/${knownSpecialistId}?office=${secondOffice}`,
    );
    renderBooking({
      session: signedIn(
        buildMeResponse({
          registrationStatus: 'PENDING_COMPLETE_PATIENT',
          profiles: {
            patient: patientFacet({ status: 'PENDING_PERSONAL_DATA' }),
            specialist: { exists: false },
          },
        }),
      ),
    });

    expect(
      await screen.findByRole('heading', {
        name: '¡Un último paso para agendar tu cita!',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/apartar tu lugar con Ana Pérez/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Finalizar mi registro' }),
    ).toHaveAttribute(
      'href',
      `/sign-up?redirect=${encodeURIComponent(
        `/book/${knownSpecialistId}?office=${secondOffice}`,
      )}`,
    );
    expect(
      screen.getByRole('link', { name: 'Completar más tarde' }),
    ).toHaveAttribute('href', `/s/${knownSpecialistId}`);
  });

  it('says so when the catalog does not know the specialty the API asks for', async () => {
    renderBooking({ specialtyId: null });
    expect(
      await screen.findByRole('heading', {
        name: 'Por ahora no es posible agendar con este especialista desde la web',
      }),
    ).toBeInTheDocument();
  });

  it('says so when the specialist is not active (404), in the app’s words', async () => {
    renderBooking({
      who: {
        ...specialist,
        offices: [
          {
            id: bookingIds.inactiveOffice,
            name: 'Centro Médico La Floresta',
            address: 'Av. Principal de La Floresta, Caracas',
            description: null,
          },
        ],
      },
    });
    expect(
      await screen.findByRole('heading', {
        name: 'Este especialista no se encuentra activo por el momento',
      }),
    ).toBeInTheDocument();
  });

  it('books for oneself in the app’s four steps', async () => {
    const sent = captureBooking();
    const { container } = renderBooking();

    await heading('Selecciona un consultorio');
    expect(screen.getByText('Paso 1 de 4')).toBeInTheDocument();
    expect(
      screen.getByRole('radio', { name: /Clínica El Ávila/ }),
    ).toBeChecked();
    expect(await axe(container)).toHaveNoViolations();
    await next();

    await heading('Fecha y hora');
    // The first free day comes chosen; its hours, only the free ones.
    expect(
      await screen.findByRole('radio', { name: /8:30/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('radio', { name: /^9:00/ }),
    ).not.toBeInTheDocument();
    // «Siguiente» without an hour says what is missing (by the hours'
    // own heading, read aloud by the bar's live line), and stays.
    await next();
    expect(screen.getAllByText('Selecciona un horario')).toHaveLength(2);
    expect(screen.getByText('Paso 2 de 4')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: /8:30/ }));
    await next();

    await heading('Paciente');
    // Neither the reason nor whom it is for comes chosen.
    await next();
    expect(await screen.findByText('Selecciona un motivo')).toBeInTheDocument();
    expect(
      screen.getByText('Elige para quién es la cita.'),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('radio', { name: /Consulta general/ }),
    );
    await userEvent.click(screen.getByRole('radio', { name: 'Para mí' }));
    await next();

    await heading('Resumen de tu cita');
    expect(screen.getByText('Clínica El Ávila')).toBeInTheDocument();
    expect(screen.getByText('Consulta general')).toBeInTheDocument();
    expect(screen.getByText(/\$\s40\s\(USD\)/)).toBeInTheDocument();
    expect(screen.getByText(/ana@example\.com/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Agendar' }));

    expect(
      await screen.findByRole('heading', { name: '¡Todo listo!' }),
    ).toBeInTheDocument();
    expect(sent.body).toEqual({
      specialistId: knownSpecialistId,
      officeId,
      date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) as unknown,
      startTime: '08:30',
      forSelf: true,
      specialtyId: bookingIds.internalMedicine,
      consultationReasonId: bookingIds.generalReason,
    });
    expect(screen.getByRole('link', { name: 'Ver mi cita' })).toHaveAttribute(
      'href',
      `/a/${bookingIds.booked}`,
    );
    expect(screen.getByRole('link', { name: 'Ver mis citas' })).toHaveAttribute(
      'href',
      '/appointments',
    );
  });

  it('opens on the day and hour of the office the profile named', async () => {
    window.history.replaceState(
      null,
      '',
      `/book/${knownSpecialistId}?office=${secondOffice}`,
    );
    renderBooking();

    await heading('Fecha y hora');
    expect(screen.getByText('Paso 2 de 4')).toBeInTheDocument();
  });

  it('books for someone already in one’s care', async () => {
    const sent = captureBooking();
    renderBooking();

    await toPatientStep();
    await userEvent.click(
      screen.getByRole('radio', { name: 'Para un tercero' }),
    );
    await userEvent.click(
      await screen.findByRole('radio', { name: /Sofía Pérez/ }),
    );
    await next();

    await heading('Resumen de tu cita');
    expect(screen.getByText('Sofía Pérez')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Agendar' }));

    await screen.findByRole('heading', { name: '¡Todo listo!' });
    expect(sent.body).toMatchObject({
      forSelf: false,
      terceroId: bookingIds.sofia,
    });
    expect(sent.body).not.toHaveProperty('tercero');
  });

  it('books for someone new: no document under 9 years and a month', async () => {
    const sent = captureBooking();
    renderBooking();
    const today = todayInCaracas();

    await toPatientStep();
    await userEvent.click(
      screen.getByRole('radio', { name: 'Para un tercero' }),
    );
    await userEvent.click(
      await screen.findByRole('radio', { name: 'Otra persona' }),
    );
    await userEvent.type(screen.getByLabelText('Nombre'), 'Luis');
    await userEvent.type(screen.getByLabelText('Apellido'), 'Pérez');
    await userEvent.type(
      screen.getByLabelText('Fecha de nacimiento'),
      yearsBefore(today, 5),
    );
    await userEvent.click(screen.getByRole('radio', { name: 'Hombre' }));
    expect(
      screen.getByText(
        'Aún no tiene 9 años y un mes: no hace falta su cédula.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText('Cédula de identidad'),
    ).not.toBeInTheDocument();
    await next();

    await heading('Resumen de tu cita');
    await userEvent.click(screen.getByRole('button', { name: 'Agendar' }));
    await screen.findByRole('heading', { name: '¡Todo listo!' });
    expect(sent.body).toMatchObject({
      forSelf: false,
      tercero: {
        firstName: 'Luis',
        lastName: 'Pérez',
        dateOfBirth: yearsBefore(today, 5),
        sex: 'MALE',
      },
    });
  });

  it('asks an older person in one’s care for the document', async () => {
    renderBooking();

    await toPatientStep();
    await userEvent.click(
      screen.getByRole('radio', { name: 'Para un tercero' }),
    );
    await userEvent.click(
      await screen.findByRole('radio', { name: 'Otra persona' }),
    );
    await userEvent.type(screen.getByLabelText('Nombre'), 'Luis');
    await userEvent.type(screen.getByLabelText('Apellido'), 'Pérez');
    await userEvent.type(
      screen.getByLabelText('Fecha de nacimiento'),
      yearsBefore(todayInCaracas(), 30),
    );
    await userEvent.click(screen.getByRole('radio', { name: 'Hombre' }));
    await next();

    const document = screen.getByLabelText('Cédula de identidad');
    expect(document).toHaveAccessibleDescription('Este campo es requerido.');
    await heading('Paciente');
  });

  it('takes the person back to the hours when theirs was just taken', async () => {
    captureBooking();
    renderBooking();

    await toPatientStep(/^10:00/);
    await userEvent.click(screen.getByRole('radio', { name: 'Para mí' }));
    await next();
    await heading('Resumen de tu cita');
    await userEvent.click(screen.getByRole('button', { name: 'Agendar' }));

    await heading('Fecha y hora');
    const warning = screen.getByRole('alert');
    expect(
      within(warning).getByText('Horario no disponible'),
    ).toBeInTheDocument();
    expect(
      within(warning).getByText(
        'El horario que seleccionaste acaba de ser ocupado. Por favor selecciona otro.',
      ),
    ).toBeInTheDocument();
  });
});
