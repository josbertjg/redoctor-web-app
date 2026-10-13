import { screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { pageNamespaces } from '@/app/lib/i18n/client-messages';

import { buildInvoice, buildSubscription } from '@/tests/factories/billing';
import { freezeClock, renderPanel } from '@/tests/panel';

import { PanelGreeting } from './panel-greeting';
import { PanelPlanCard } from './panel-plan-card';
import { PanelTodayCard } from './panel-today-card';
import {
  invoicesHandler,
  subscriptionHandler,
} from '../../../tests/msw/handlers/billing';
import { server } from '../../../tests/msw/server';

function renderHome() {
  return renderPanel(
    <>
      <PanelGreeting />
      <PanelPlanCard />
      <PanelTodayCard />
    </>,
    pageNamespaces.panelHome,
  );
}

beforeEach(() => {
  freezeClock();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('the panel’s home', () => {
  it('greets the specialist and offers the plans when there is none', async () => {
    const { container } = renderHome();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Hola, Dr. Luis Gómez' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', {
        name: '¡Llega a más pacientes desde hoy!',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver planes' })).toHaveAttribute(
      'href',
      '/panel/subscription/pay',
    );
    expect(await screen.findByText('3 pacientes hoy')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('puts what the plan asks for first, then the plan itself', async () => {
    server.use(
      subscriptionHandler(buildSubscription()),
      invoicesHandler([buildInvoice()]),
    );
    renderHome();

    expect(
      await screen.findByRole('heading', {
        name: 'Tu suscripción está sin pagar',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pagar ahora' })).toHaveAttribute(
      'href',
      '/panel/subscription/pay',
    );
    expect(
      screen.getByRole('heading', { name: 'Profesional' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Ver mi suscripción' }),
    ).toHaveAttribute('href', '/panel/subscription');
  });

  it('counts today’s patients and shows the next appointment still ahead', async () => {
    renderHome();

    // Four today, one of them cancelled; at 10:00 the 8:00 one is over.
    expect(await screen.findByText('3 pacientes hoy')).toBeInTheDocument();
    expect(screen.getByText('Tu próxima cita')).toBeInTheDocument();
    expect(screen.getByText('Luisa Méndez')).toBeInTheDocument();
    expect(screen.queryByText('Carlos Rivas')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver mi agenda' })).toHaveAttribute(
      'href',
      '/panel/agenda',
    );
  });
});
