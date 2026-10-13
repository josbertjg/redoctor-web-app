import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { pageNamespaces } from '@/app/lib/i18n/client-messages';
import { meResponseSchema, toAccount } from '@/app/lib/schemas/identity';

import { Toaster } from '@/app/ui/toast';
import {
  buildInvoice,
  buildIntent,
  buildReported,
  buildSubscription,
  hoursFromNow,
  intentIds,
  planIds,
  usd,
  type SubscriptionPayload,
} from '@/tests/factories/billing';
import { renderWithPageMessages } from '@/tests/render';

import { SessionContext, type Session } from '@/app/hooks/use-session';

import { SubscriptionFlow } from './subscription-flow';
import { buildSpecialistMeResponse } from '../../../tests/factories/identity';
import { apiUrl, errorEnvelope } from '../../../tests/msw/api-url';
import {
  invoiceDetailHandler,
  invoicesHandler,
  subscriptionHandler,
} from '../../../tests/msw/handlers/billing';
import { validToken } from '../../../tests/msw/handlers/identity';
import { server } from '../../../tests/msw/server';

const user = {
  id: 'uid-1',
  email: 'luis@example.com',
  name: 'Dr. Luis Gómez',
  photo: null,
  provider: 'google' as const,
  getToken: () => Promise.resolve(validToken),
};

const signedIn: Session = {
  status: 'signed-in',
  expected: true,
  user,
  account: toAccount(meResponseSchema.parse(buildSpecialistMeResponse())),
  accountStatus: 'ready',
  accountError: null,
  accountRetrying: false,
  retryAccount: vi.fn(),
  signOut: vi.fn(() => Promise.resolve()),
};

/** As app/providers.tsx builds it: no retries, so a failure shows at once. */
const queryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

function renderSubscription() {
  return renderWithPageMessages(
    <QueryClientProvider client={queryClient()}>
      <SessionContext.Provider value={signedIn}>
        {/* As the page renders it: inside its main landmark. */}
        <main>
          <SubscriptionFlow />
        </main>
      </SessionContext.Provider>
      <Toaster regionLabel="Notificaciones" closeLabel="Cerrar" />
    </QueryClientProvider>,
    pageNamespaces.subscription,
  );
}

const unpaidSubscription = () => [
  subscriptionHandler(buildSubscription()),
  invoicesHandler([buildInvoice()]),
];

/*
 * «Mi suscripción» (`/panel/subscription`): where the plan stands, the
 * notice with what to do, and the way to the payment page — a link, since
 * paying is a page of its own (`/panel/subscription/pay`).
 */
describe('SubscriptionFlow', () => {
  it('tells an unpaid subscription where it stands and leads to pay it', async () => {
    server.use(...unpaidSubscription());
    const { container } = renderSubscription();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Mi suscripción' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Sin pagar')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Tu suscripción está sin pagar',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Págala antes del .* para activar tu plan/),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pagar ahora' })).toHaveAttribute(
      'href',
      '/panel/subscription/pay',
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('offers the plans when there is none', async () => {
    renderSubscription();

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Todavía no tienes un plan',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver planes' })).toHaveAttribute(
      'href',
      '/panel/subscription/pay',
    );
  });

  it('says a payment is being verified and offers nothing to pay', async () => {
    server.use(
      ...unpaidSubscription(),
      invoiceDetailHandler(buildInvoice(), [
        buildIntent({ status: 'IN_REVIEW', reported: buildReported() }),
      ]),
    );
    renderSubscription();

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Estamos verificando tu pago',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Te avisaremos en cuanto lo aprobemos. Mientras tanto no hace falta enviar otro.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Pagar ahora' }),
    ).not.toBeInTheDocument();
  });

  it('shows the admin’s reason for a rejected payment and the way to pay again', async () => {
    server.use(
      ...unpaidSubscription(),
      invoiceDetailHandler(buildInvoice(), [
        buildIntent({
          id: intentIds.rejected,
          status: 'FAILED',
          reported: buildReported(),
          failureReason: 'La referencia no aparece en el estado de cuenta.',
        }),
      ]),
    );
    renderSubscription();

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Rechazamos tu último pago',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Motivo del rechazo')).toBeInTheDocument();
    expect(
      screen.getByText('La referencia no aparece en el estado de cuenta.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pagar ahora' })).toHaveAttribute(
      'href',
      '/panel/subscription/pay',
    );
  });

  it('tells an active plan where it stands, with its period and its coupon', async () => {
    server.use(
      subscriptionHandler(
        buildSubscription({
          status: 'ACTIVE',
          incompleteExpiresAt: null,
          discount: {
            code: 'REDOCTOR20',
            couponName: 'Bienvenida 2026',
            discountType: 'PERCENT',
            percentOff: 20,
            amountOff: null,
            duration: 'REPEATING',
            remainingCycles: 2,
            status: 'ACTIVE',
          },
          courtesy: { monthsLeft: 1, endsAt: null },
        }),
      ),
    );
    renderSubscription();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Mi suscripción' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Activa')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Tu plan está al día. Se renueva el 11 de noviembre de 2026.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('12 oct. – 11 nov. 2026')).toBeInTheDocument();
    expect(screen.getByText('Cupón REDOCTOR20')).toBeInTheDocument();
    expect(screen.getByText('20 % de descuento')).toBeInTheDocument();
    expect(screen.getByText('Mensualidades con descuento')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1 mes')).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Pagar ahora' }),
    ).not.toBeInTheDocument();
  });

  it('counts the days a past-due plan has left', async () => {
    server.use(
      subscriptionHandler(
        buildSubscription({
          status: 'PAST_DUE',
          incompleteExpiresAt: null,
          graceEndsAt: hoursFromNow(5 * 24),
        }),
      ),
      invoicesHandler([buildInvoice()]),
    );
    renderSubscription();

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Tu plan se cancelará en 5 días',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Pago vencido')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pagar ahora' })).toHaveAttribute(
      'href',
      '/panel/subscription/pay',
    );
  });

  it('says when the subscription cannot be read and offers to try again', async () => {
    server.use(
      http.get(apiUrl('/billing/me/subscription'), () =>
        HttpResponse.json(errorEnvelope('ERR_1002', 'Validation failed'), {
          status: 400,
        }),
      ),
    );
    renderSubscription();

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'No pudimos cargar tu suscripción',
      }),
    ).toBeInTheDocument();
    server.use(subscriptionHandler(null));
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Todavía no tienes un plan',
      }),
    ).toBeInTheDocument();
  });

  it('tells an account the API does not take for a specialist’s', async () => {
    server.use(
      http.get(apiUrl('/billing/me/subscription'), () =>
        HttpResponse.json(errorEnvelope('ERR_1003', 'Forbidden'), {
          status: 403,
        }),
      ),
    );
    renderSubscription();

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Esta página es para especialistas',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a mi panel' })).toHaveAttribute(
      'href',
      '/panel',
    );
  });
});

describe('SubscriptionFlow, changing plan', () => {
  const corporate = {
    id: planIds.corporate,
    slug: 'corporativo',
    name: 'Corporativo',
  };
  const professional = {
    id: planIds.professional,
    slug: 'profesional',
    name: 'Profesional',
  };
  const active = (overrides: Partial<SubscriptionPayload> = {}) =>
    buildSubscription({
      status: 'ACTIVE',
      incompleteExpiresAt: null,
      plan: corporate,
      price: usd(6000),
      ...overrides,
    });

  it('leads to the plans while the plan can change', async () => {
    server.use(subscriptionHandler(active()));
    renderSubscription();

    expect(
      await screen.findByRole('link', { name: /Cambiar de plan/ }),
    ).toHaveAttribute('href', '/panel/subscription/pay?view=plans');
  });

  it('offers no change while an upgrade waits for its payment', async () => {
    server.use(
      subscriptionHandler(
        active({
          pendingUpgrade: { plan: professional, invoiceId: 'invoice-x' },
        }),
      ),
    );
    renderSubscription();

    await screen.findByRole('heading', { level: 2, name: 'Corporativo' });
    expect(
      screen.queryByRole('link', { name: /Cambiar de plan/ }),
    ).not.toBeInTheDocument();
  });

  it('undoes a scheduled downgrade after asking', async () => {
    let current = active({
      scheduledChange: {
        plan: professional,
        price: usd(3000),
        effectiveAt: '2026-11-12T03:59:59.999Z',
      },
    });
    server.use(
      http.get(apiUrl('/billing/me/subscription'), () =>
        HttpResponse.json({
          subscription: current,
          access: { hasAccess: true },
        }),
      ),
      http.delete(apiUrl('/billing/me/subscription/scheduled-change'), () => {
        current = active();
        return HttpResponse.json({ subscription: current });
      }),
    );
    const { baseElement } = renderSubscription();

    expect(await screen.findByText('Próximo plan')).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Anular el cambio de plan' }),
    );
    const sheet = await screen.findByRole('dialog', {
      name: '¿Anular el cambio al plan Profesional?',
    });
    expect(
      within(sheet).getByText(
        'Sigues en tu plan Corporativo y se renueva como siempre.',
      ),
    ).toBeInTheDocument();
    expect(await axe(baseElement)).toHaveNoViolations();

    await userEvent.click(
      within(sheet).getByRole('button', { name: 'Sí, anular el cambio' }),
    );
    expect(
      await screen.findByText('Listo. Sigues en tu plan actual.'),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText('Próximo plan')).not.toBeInTheDocument();
    });
    expect(
      screen.queryByRole('button', { name: 'Anular el cambio de plan' }),
    ).not.toBeInTheDocument();
  });
});
