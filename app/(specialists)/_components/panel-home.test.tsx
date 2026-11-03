import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { pageNamespaces } from '@/app/lib/i18n/client-messages';
import { meResponseSchema, toAccount } from '@/app/lib/schemas/identity';

import { buildInvoice, buildSubscription } from '@/tests/factories/billing';
import {
  buildSpecialistMeResponse,
  specialistFacet,
} from '@/tests/factories/identity';
import {
  buildMyProfileResponse,
  buildOwnSpecialty,
} from '@/tests/factories/specialists';
import { freezeClock, renderPanel, specialistSession } from '@/tests/panel';

import { PanelHome } from './panel-home';
import { PanelProfileLinks } from './panel-links';
import { apiUrl } from '../../../tests/msw/api-url';
import {
  invoicesHandler,
  subscriptionHandler,
} from '../../../tests/msw/handlers/billing';
import { server } from '../../../tests/msw/server';

const sessionWith = (
  overrides: Parameters<typeof buildSpecialistMeResponse>[0],
) =>
  specialistSession(undefined, {
    account: toAccount(
      meResponseSchema.parse(buildSpecialistMeResponse(overrides)),
    ),
  });

function renderHome(session = specialistSession()) {
  return renderPanel(<PanelHome />, pageNamespaces.panelHome, session);
}

beforeEach(() => {
  freezeClock();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('the panel’s home', () => {
  it('greets the specialist on the blue', async () => {
    const { container } = renderHome();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Hola, Dr. Luis Gómez' }),
    ).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('shows how far the profile is from the search, and leads to «Mi perfil»', async () => {
    server.use(subscriptionHandler(null));
    renderHome(sessionWith({ visibilityStatus: 'NO_SCHEDULES' }));

    const card = await screen.findByRole('link', {
      name: /Tu cuenta está al \d+%/,
    });
    expect(card).toHaveAttribute('href', '/panel/profile');
    expect(within(card).getByText('URGENTE')).toBeInTheDocument();
    expect(
      await within(card).findByText(/configura tus horarios de atención\./),
    ).toBeInTheDocument();
  });

  it('puts the notice first and hides the activation', async () => {
    server.use(
      subscriptionHandler(buildSubscription()),
      invoicesHandler([buildInvoice()]),
    );
    renderHome(sessionWith({ visibilityStatus: 'NO_SUBSCRIPTION' }));

    expect(
      await screen.findByRole('heading', {
        name: 'Tu suscripción está sin pagar',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Tu cuenta está al/)).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Ver mi suscripción' }),
    ).toHaveAttribute('href', '/panel/subscription');
  });

  it('offers no plan before a verified specialty', async () => {
    server.use(
      subscriptionHandler(null),
      http.get(apiUrl('/specialists/profile'), () =>
        HttpResponse.json(
          buildMyProfileResponse({
            specialties: [buildOwnSpecialty({ verificationStatus: 'PENDING' })],
          }),
        ),
      ),
    );
    renderHome(
      sessionWith({
        registrationStatus: 'WAITING_ADMIN_REVIEW',
        visibilityStatus: 'SPECIALTIES_PENDING',
        profiles: {
          patient: { exists: false },
          specialist: specialistFacet({ status: 'WAITING_ADMIN_REVIEW' }),
        },
      }),
    );

    expect(await screen.findByText('EN REVISIÓN')).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Ver planes' }),
    ).not.toBeInTheDocument();
  });

  it('offers the plans once a specialty is verified', async () => {
    server.use(subscriptionHandler(null));
    renderHome(sessionWith({ visibilityStatus: 'NO_SUBSCRIPTION' }));

    expect(
      await screen.findByRole('heading', {
        name: '¡Llega a más pacientes desde hoy!',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver planes' })).toHaveAttribute(
      'href',
      '/pay',
    );
  });

  it('shows the week’s open appointments with a plan in force, day by day', async () => {
    server.use(subscriptionHandler(buildSubscription({ status: 'ACTIVE' })));
    renderHome();

    // Wednesday 14: Luisa (11:00, confirmed) and Pedro (15:00) are open; the
    // 8:00 one is over and the 16:00 one cancelled.
    expect(await screen.findByText('2 pacientes hoy')).toBeInTheDocument();
    expect(screen.getByText('Luisa Méndez')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver todas' })).toHaveAttribute(
      'href',
      '/panel/agenda/2026-10-14',
    );
    const today = screen.getByRole('button', { name: /mié.*14/i });
    expect(today).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(screen.getByRole('button', { name: /mar.*13/i }));
    expect(
      await screen.findByText('No tienes citas este día'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver todas' })).toHaveAttribute(
      'href',
      '/panel/agenda/2026-10-13',
    );
  });

  it('draws the week’s appointments per day, with its table', async () => {
    server.use(subscriptionHandler(buildSubscription({ status: 'ACTIVE' })));
    renderHome();

    const table = await screen.findByRole('table', { hidden: true });
    const wednesday = within(table).getByRole('row', {
      name: /miércoles.*3/i,
      hidden: true,
    });
    expect(wednesday).toBeInTheDocument();
  });

  it('leads to the profile and to each specialty’s review', () => {
    renderPanel(<PanelProfileLinks />, pageNamespaces.panelHome);

    expect(screen.getByRole('link', { name: /Mi perfil/ })).toHaveAttribute(
      'href',
      '/panel/profile',
    );
    expect(
      screen.getByRole('link', { name: /Mis especialidades/ }),
    ).toHaveAttribute('href', '/panel/specialties');
  });
});
