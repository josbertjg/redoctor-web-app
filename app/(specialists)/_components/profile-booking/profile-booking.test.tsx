import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { pageNamespaces } from '@/app/lib/i18n/client-messages';
import { meResponseSchema, toAccount } from '@/app/lib/schemas/identity';

import type { BookingSpecialist } from '@/app/ui/booking/booking-types';
import { buildAppointment } from '@/tests/factories/appointments';
import { bookingIds } from '@/tests/factories/booking';
import {
  buildMeResponse,
  buildSpecialistMeResponse,
} from '@/tests/factories/identity';
import {
  publicAgendaOfficeId,
  publicAgendaSecondOfficeId,
} from '@/tests/factories/public-availability';
import { knownSpecialistId } from '@/tests/factories/specialists';
import { apiUrl } from '@/tests/msw/api-url';
import { validToken } from '@/tests/msw/handlers/identity';
import { server } from '@/tests/msw/server';
import { renderWithPageMessages } from '@/tests/render';

import {
  noSession,
  SessionContext,
  type Session,
} from '@/app/hooks/use-session';

import { BookButton } from './book-button';
import { BookingDialog } from './booking-dialog';
import { BookingPanel } from './booking-panel';
import { ProfileBookingProvider } from './profile-booking';

const navigation = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: navigation.push, replace: vi.fn() }),
  usePathname: () => window.location.pathname,
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

const specialist: BookingSpecialist = {
  id: knownSpecialistId,
  name: 'Ana Pérez',
  photoUrl: null,
  verified: true,
  specialties: ['Medicina Interna'],
  offices: [
    {
      id: publicAgendaOfficeId,
      name: 'Clínica El Ávila',
      address: 'Av. San Juan Bosco, Altamira, Caracas',
      description: null,
      reasons: null,
    },
    {
      id: publicAgendaSecondOfficeId,
      name: 'Centro Médico La Floresta',
      address: 'Av. Principal de La Floresta, Caracas',
      description: null,
      reasons: null,
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

/** A laptop's screen, or a phone's: the panel only reads the agenda on a wide one. */
function screenIs(wide: boolean) {
  window.matchMedia = (query: string) =>
    ({
      matches: wide && query === '(min-width: 64rem)',
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

const realMatchMedia = window.matchMedia.bind(window);

beforeEach(() => {
  window.history.replaceState(null, '', `/s/${knownSpecialistId}`);
  screenIs(true);
});

afterEach(() => {
  window.matchMedia = realMatchMedia;
});

function renderProfileBooking(
  session: Session = noSession,
  who: BookingSpecialist = specialist,
) {
  return renderWithPageMessages(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <SessionContext.Provider value={session}>
        <ProfileBookingProvider
          specialist={who}
          specialtyId={bookingIds.internalMedicine}
          ownerNotice={{
            title: 'Es una vista previa',
            description: 'Aquí tus pacientes agendan su cita contigo.',
          }}
          expectSpecialist={false}
        >
          <BookButton />
          <BookingPanel titleId="booking-panel-title" />
          <BookingDialog />
        </ProfileBookingProvider>
      </SessionContext.Provider>
    </QueryClientProvider>,
    pageNamespaces.specialistProfile,
  );
}

const panel = () => screen.getByRole('region', { name: 'Agendar cita' });

/** The hours the panel offers, once the agenda is read. */
const freeHour = (name: RegExp) =>
  within(panel()).findByRole('radio', { name });

describe('the profile’s booking', () => {
  it('shows a visitor the specialist’s real agenda: the first free day chosen, its booked hours taken', async () => {
    const { container } = renderProfileBooking();

    expect(
      within(panel()).getByRole('radio', { name: /Clínica El Ávila/ }),
    ).toBeChecked();
    expect(await freeHour(/^8:30/)).toBeInTheDocument();
    // A day comes chosen, in the brand's green.
    expect(
      within(panel())
        .getAllByRole('button')
        .some((day) => day.getAttribute('aria-pressed') === 'true'),
    ).toBe(true);
    // The booked hour is said, never offered.
    expect(within(panel()).getByText(/9:00.*ocupado/)).toBeInTheDocument();
    expect(
      within(panel()).queryByRole('radio', { name: /^9:00/ }),
    ).not.toBeInTheDocument();
    // The afternoon's hours, by the part of the day.
    await userEvent.click(
      within(panel()).getByRole('radio', { name: 'Tarde' }),
    );
    expect(await freeHour(/^2:00/)).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('says to choose an hour before «Agendar», then asks for the session in the modal', async () => {
    renderProfileBooking();
    await freeHour(/^8:30/);

    await userEvent.click(
      within(panel()).getByRole('button', { name: 'Agendar' }),
    );
    expect(
      within(panel()).getByText('Selecciona un horario', {
        selector: 'p',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await userEvent.click(await freeHour(/^8:30/));
    await userEvent.click(
      within(panel()).getByRole('button', { name: 'Agendar' }),
    );
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText('Entra para agendar tu cita'),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: /Google/ }),
    ).toBeInTheDocument();
  });

  it('books a patient from the panel: the patient and the summary in the modal, then «¡Todo listo!»', async () => {
    let sent: Record<string, unknown> | null = null;
    server.use(
      http.post(apiUrl('/scheduling/appointments'), async ({ request }) => {
        sent = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          {
            appointment: buildAppointment({ id: bookingIds.booked }),
          },
          { status: 201 },
        );
      }),
    );
    renderProfileBooking(signedIn());

    await userEvent.click(await freeHour(/^8:30/));
    await userEvent.click(
      within(panel()).getByRole('button', { name: 'Agendar' }),
    );
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Paso 2 de 3')).toBeInTheDocument();
    await userEvent.click(
      await within(dialog).findByRole('radio', { name: /Consulta general/ }),
    );
    await userEvent.click(
      within(dialog).getByRole('radio', { name: 'Para mí' }),
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Siguiente' }),
    );

    expect(
      await within(dialog).findByText('Resumen de tu cita'),
    ).toBeInTheDocument();
    expect(within(dialog).getByText(/ana@example\.com/)).toBeInTheDocument();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Agendar' }),
    );

    expect(
      await screen.findByRole('heading', { name: '¡Todo listo!' }),
    ).toBeInTheDocument();
    expect(sent).toMatchObject({
      specialistId: knownSpecialistId,
      officeId: publicAgendaOfficeId,
      startTime: '08:30',
      forSelf: true,
      specialtyId: bookingIds.internalMedicine,
      consultationReasonId: bookingIds.generalReason,
    });
  });

  it('after an hour taken meanwhile, another one leads to the patient again, not past it', async () => {
    let attempts = 0;
    server.use(
      http.post(apiUrl('/scheduling/appointments'), () => {
        attempts += 1;
        return attempts === 1
          ? HttpResponse.json(
              { code: 'ERR_4002', message: 'Slot taken' },
              { status: 409 },
            )
          : HttpResponse.json(
              { appointment: buildAppointment({ id: bookingIds.booked }) },
              { status: 201 },
            );
      }),
    );
    renderProfileBooking(signedIn());

    await userEvent.click(await freeHour(/^8:30/));
    await userEvent.click(
      within(panel()).getByRole('button', { name: 'Agendar' }),
    );
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(
      await within(dialog).findByRole('radio', { name: /Consulta general/ }),
    );
    await userEvent.click(
      within(dialog).getByRole('radio', { name: 'Para mí' }),
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Siguiente' }),
    );
    await userEvent.click(
      await within(dialog).findByRole('button', { name: 'Agendar' }),
    );

    // Taken meanwhile: back to the hours, the patient's answers kept.
    expect(
      await within(dialog).findByText('Horario no disponible'),
    ).toBeInTheDocument();
    await userEvent.click(
      await within(dialog).findByRole('radio', { name: /^9:30/ }),
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Siguiente' }),
    );
    // The patient's step, to look at again: «Siguiente» there never fires
    // with the hours' tap.
    expect(await within(dialog).findByText('Paso 2 de 3')).toBeInTheDocument();
    expect(
      within(dialog).queryByText('Resumen de tu cita'),
    ).not.toBeInTheDocument();
  });

  it('on a phone, «Agendar cita» opens the modal at the day and hour', async () => {
    screenIs(false);
    renderProfileBooking(signedIn());

    await userEvent.click(screen.getByRole('button', { name: 'Agendar cita' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Fecha y hora')).toBeInTheDocument();
    expect(within(dialog).getByText('Paso 1 de 3')).toBeInTheDocument();
    // «Siguiente» without an hour says so, and stays.
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Siguiente' }),
    );
    expect(within(dialog).getByText('Paso 1 de 3')).toBeInTheDocument();
    await userEvent.click(
      await within(dialog).findByRole('radio', { name: /^8:30/ }),
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Siguiente' }),
    );
    expect(await within(dialog).findByText('Paso 2 de 3')).toBeInTheDocument();
  });

  it('offers the specialist no booking on their own profile', async () => {
    // The factory's specialist is `specialist-1`: this profile is theirs.
    renderProfileBooking(signedIn(buildSpecialistMeResponse()), {
      ...specialist,
      id: 'specialist-1',
    });
    expect(
      await screen.findByText('Así ven tu perfil tus pacientes.'),
    ).toBeInTheDocument();
    expect(
      within(panel()).getByText('Es una vista previa'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Agendar cita' }),
    ).not.toBeInTheDocument();
    expect(
      within(panel()).queryByRole('button', { name: 'Agendar' }),
    ).not.toBeInTheDocument();
  });

  it('comes back from the sign-up to the modal, the choice kept and the address cleaned', async () => {
    window.history.replaceState(
      null,
      '',
      `/s/${knownSpecialistId}?office=${publicAgendaSecondOfficeId}&date=2099-03-02&time=09:30&book=1`,
    );
    renderProfileBooking(signedIn());

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Paso 2 de 3')).toBeInTheDocument();
    // The panel lies under the modal, hidden from assistive technology.
    expect(
      document.querySelector<HTMLInputElement>(
        'input[name$="booking-office"]:checked',
      )?.value,
    ).toBe(publicAgendaSecondOfficeId);
    await waitFor(() => {
      expect(window.location.search).toBe('');
    });
  });

  it('keeps the office and part of the day preselected in both the panel and the modal when both are mounted', async () => {
    renderProfileBooking(signedIn());
    await freeHour(/^8:30/);

    await userEvent.click(screen.getByRole('button', { name: 'Agendar cita' }));
    const dialog = await screen.findByRole('dialog');
    expect(
      await within(dialog).findByRole('radio', { name: /^8:30/ }),
    ).toBeInTheDocument();

    expect(
      within(dialog).getByRole('radio', { name: /Clínica El Ávila/ }),
    ).toBeChecked();
    expect(
      within(panel()).getByRole('radio', {
        name: /Clínica El Ávila/,
        hidden: true,
      }),
    ).toBeChecked();
    expect(within(dialog).getByRole('radio', { name: 'Mañana' })).toBeChecked();
    expect(
      within(panel()).getByRole('radio', { name: 'Mañana', hidden: true }),
    ).toBeChecked();
  });
});
