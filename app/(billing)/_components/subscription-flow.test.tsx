import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { formatDate } from '@/app/lib/format/dates';
import { pageNamespaces } from '@/app/lib/i18n/client-messages';
import { meResponseSchema, toAccount } from '@/app/lib/schemas/identity';

import { Toaster } from '@/app/ui/toast';
import {
  buildBalanceMovement,
  buildInvoice,
  buildIntent,
  buildPaidInvoice,
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
  balanceHandler,
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
 * paying is a page of its own (`/pay`).
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
      '/pay',
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
      '/pay',
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
      '/pay',
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
      '/pay',
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
    ).toHaveAttribute('href', '/pay?view=plans');
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

describe('SubscriptionFlow, the rest of «Mi suscripción»', () => {
  const active = (overrides: Partial<SubscriptionPayload> = {}) =>
    buildSubscription({
      status: 'ACTIVE',
      incompleteExpiresAt: null,
      ...overrides,
    });

  /** The subscription as the API keeps it, moved by the writes. */
  const live = (first: SubscriptionPayload) => {
    let current = first;
    return {
      set: (next: SubscriptionPayload) => {
        current = next;
        return HttpResponse.json({ subscription: current });
      },
      handler: http.get(apiUrl('/billing/me/subscription'), () =>
        HttpResponse.json({
          subscription: current,
          access: { hasAccess: current.status === 'ACTIVE' },
        }),
      ),
    };
  };

  it('cancels at the period’s end after saying what happens, then takes it back', async () => {
    const endsAt = hoursFromNow(10 * 24);
    const ends = formatDate(endsAt) ?? '';
    const subscription = live(
      active({ currentPeriod: { start: hoursFromNow(-20 * 24), end: endsAt } }),
    );
    server.use(
      subscription.handler,
      http.post(apiUrl('/billing/me/subscription/cancel'), () =>
        subscription.set(
          active({
            currentPeriod: { start: hoursFromNow(-20 * 24), end: endsAt },
            cancelAtPeriodEnd: true,
            endsAt,
          }),
        ),
      ),
      http.post(apiUrl('/billing/me/subscription/resume'), () =>
        subscription.set(
          active({
            currentPeriod: { start: hoursFromNow(-20 * 24), end: endsAt },
          }),
        ),
      ),
    );
    const { baseElement } = renderSubscription();

    await userEvent.click(
      await screen.findByRole('button', { name: 'Cancelar mi plan' }),
    );
    const sheet = await screen.findByRole('dialog', {
      name: '¿Cancelar tu plan?',
    });
    expect(
      within(sheet).getByText(
        `Conservas tu plan y sus beneficios hasta el ${ends}.`,
      ),
    ).toBeInTheDocument();
    expect(
      within(sheet).getByText('No te cobraremos la próxima mensualidad.'),
    ).toBeInTheDocument();
    // What loses something offers the way back first.
    const labels = within(sheet)
      .getAllByRole('button')
      .map((button) => button.textContent);
    expect(labels.indexOf('No, mantener mi plan')).toBeLessThan(
      labels.indexOf('Sí, cancelar'),
    );
    expect(await axe(baseElement)).toHaveNoViolations();

    await userEvent.click(
      within(sheet).getByRole('button', { name: 'Sí, cancelar' }),
    );
    expect(
      await screen.findByText('Listo. Tu plan termina al final del periodo.'),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Cancelación pedida',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        `Tu plan termina el ${ends}. Hasta entonces sigues apareciendo en las búsquedas.`,
      ),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: 'Cancelar mi plan' }),
      ).not.toBeInTheDocument();
    });
    expect(
      screen.queryByRole('link', { name: /Cambiar de plan/ }),
    ).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: 'Reanudar mi plan' }),
    );
    const resume = await screen.findByRole('dialog', {
      name: '¿Reanudar tu plan?',
    });
    expect(
      within(resume).getByText(`Tu plan se renovará el ${ends}, como siempre.`),
    ).toBeInTheDocument();
    await userEvent.click(
      within(resume).getByRole('button', { name: 'Sí, reanudar' }),
    );
    expect(
      await screen.findByText('Listo. Tu plan sigue activo.'),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: 'Cancelar mi plan' }),
    ).toBeInTheDocument();
  });

  it('drops an unpaid subscription after asking, and leaves the plans free to choose', async () => {
    const subscription = live(buildSubscription());
    server.use(
      subscription.handler,
      invoicesHandler([buildInvoice()]),
      http.post(apiUrl('/billing/me/subscription/abandon'), () =>
        subscription.set(
          buildSubscription({
            status: 'INCOMPLETE_EXPIRED',
            incompleteExpiresAt: null,
          }),
        ),
      ),
    );
    renderSubscription();

    await userEvent.click(
      await screen.findByRole('button', { name: 'Descartar esta suscripción' }),
    );
    const sheet = await screen.findByRole('dialog', {
      name: '¿Descartar tu suscripción al plan Profesional?',
    });
    expect(
      within(sheet).getByText('Anularemos su recibo sin pagar.'),
    ).toBeInTheDocument();
    await userEvent.click(
      within(sheet).getByRole('button', { name: 'Sí, descartar' }),
    );

    expect(
      await screen.findByText('Listo. Descartamos la suscripción sin pagar.'),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Todavía no tienes un plan',
      }),
    ).toBeInTheDocument();
  });

  it('offers no way to drop it while a payment is being verified', async () => {
    server.use(
      ...unpaidSubscription(),
      invoiceDetailHandler(buildInvoice(), [
        buildIntent({ status: 'IN_REVIEW', reported: buildReported() }),
      ]),
    );
    renderSubscription();

    await screen.findByRole('heading', {
      level: 2,
      name: 'Estamos verificando tu pago',
    });
    expect(
      screen.queryByRole('button', { name: 'Descartar esta suscripción' }),
    ).not.toBeInTheDocument();
  });

  it('puts a coupon on the plan in force: its discount first, then applied', async () => {
    server.use(subscriptionHandler(active()));
    renderSubscription();

    await userEvent.click(
      await screen.findByRole('button', { name: /Aplicar un cupón/ }),
    );
    const sheet = await screen.findByRole('dialog', {
      name: 'Aplicar un cupón',
    });
    const field = within(sheet).getByLabelText('Código del cupón');
    await userEvent.type(field, 'vencido');
    await userEvent.click(
      within(sheet).getByRole('button', { name: 'Ver descuento' }),
    );
    expect(
      await within(sheet).findByText('Este cupón ya venció.'),
    ).toBeInTheDocument();

    await userEvent.clear(field);
    await userEvent.type(field, 'redoctor20');
    await userEvent.click(
      within(sheet).getByRole('button', { name: 'Ver descuento' }),
    );
    expect(
      await within(sheet).findByText(
        '20 % de descuento en tu primera mensualidad',
      ),
    ).toBeInTheDocument();
    expect(
      within(sheet).getByText('Tu mensualidad quedaría en $ 24'),
    ).toBeInTheDocument();

    await userEvent.click(
      within(sheet).getByRole('button', { name: 'Aplicar cupón' }),
    );
    expect(
      await screen.findByText(
        'Cupón aplicado. Se descuenta desde tu próxima mensualidad.',
      ),
    ).toBeInTheDocument();
  });

  it('says whom the receipts are issued to, and how to change it', async () => {
    server.use(subscriptionHandler(active()));
    renderSubscription();

    expect(
      await screen.findByRole('link', { name: /Mis cupones/ }),
    ).toHaveAttribute('href', '/panel/subscription/coupons');
    await userEvent.click(
      screen.getByRole('button', { name: /Datos de cobro/ }),
    );
    const sheet = await screen.findByRole('dialog', { name: 'Datos de cobro' });
    expect(await within(sheet).findByText('Luis Gómez')).toBeInTheDocument();
    expect(within(sheet).getByText('V-12345678')).toBeInTheDocument();
    expect(within(sheet).getByText('facturas@example.com')).toBeInTheDocument();
    expect(
      within(sheet).getByText(
        'Tus recibos salen con estos datos. Si necesitas cambiarlos, escríbenos.',
      ),
    ).toBeInTheDocument();
    expect(
      within(sheet).getByRole('link', { name: /Escribir por WhatsApp/ }),
    ).toHaveAttribute('href', expect.stringContaining('https://wa.me/'));
  });

  it('shows the balance and the latest receipts, each opening its page', async () => {
    const paid = buildPaidInvoice();
    server.use(
      subscriptionHandler(active()),
      balanceHandler(500, [buildBalanceMovement()]),
      invoicesHandler([paid]),
    );
    const { container } = renderSubscription();

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Saldo a favor' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Se usa solo en tu próxima mensualidad.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Pagaste de más/ }),
    ).toHaveAttribute('href', `/panel/subscription/invoices/${paid.id}`);

    expect(
      await screen.findByRole('link', { name: /Mensualidad/ }),
    ).toHaveAttribute('href', `/panel/subscription/invoices/${paid.id}`);
    expect(screen.getByRole('link', { name: 'Ver todos' })).toHaveAttribute(
      'href',
      '/panel/subscription/invoices',
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('takes no room for a balance with nothing to tell, and says when there are no receipts', async () => {
    server.use(subscriptionHandler(active()));
    renderSubscription();

    expect(
      await screen.findByText(
        'Aquí verás cada recibo de tu plan y en qué quedó.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Saldo a favor' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Ver todos' }),
    ).not.toBeInTheDocument();
  });

  it('says what the plan includes and that it is all on while the plan gives access', async () => {
    server.use(subscriptionHandler(active()));
    renderSubscription();

    const card = await screen.findByRole('region', {
      name: '¿Qué incluye tu plan?',
    });
    expect(
      await within(card).findByText('Hasta 3 consultorios activos'),
    ).toBeInTheDocument();
    const rows = within(card).getAllByRole('listitem');
    expect(rows.map((row) => row.textContent)).toEqual([
      'Tu perfil visible para pacientes',
      'Hasta 3 consultorios activos',
      'Visualización y descarga de reportes administrativos',
    ]);
    expect(within(card).getAllByRole('img', { name: 'Incluido' })).toHaveLength(
      3,
    );
  });

  it('marks what the plan lacks, and nothing on while it gives no access', async () => {
    server.use(
      subscriptionHandler(
        active({
          plan: { id: planIds.essential, slug: 'esencial', name: 'Esencial' },
          price: usd(1500),
        }),
      ),
    );
    const { unmount } = renderSubscription();

    const card = await screen.findByRole('region', {
      name: '¿Qué incluye tu plan?',
    });
    expect(
      await within(card).findByText('Hasta 1 consultorio activo'),
    ).toBeInTheDocument();
    expect(within(card).getAllByRole('img', { name: 'Incluido' })).toHaveLength(
      2,
    );
    expect(
      within(card).getAllByRole('img', { name: 'No incluido' }),
    ).toHaveLength(1);
    unmount();

    // Unpaid, the API gives no access yet: nothing of it is on.
    server.use(...unpaidSubscription());
    renderSubscription();
    const unpaid = await screen.findByRole('region', {
      name: '¿Qué incluye tu plan?',
    });
    await within(unpaid).findByText('Hasta 3 consultorios activos');
    expect(
      within(unpaid).queryAllByRole('img', { name: 'Incluido' }),
    ).toHaveLength(0);
  });

  it('tells nothing of it for a plan that has ended', async () => {
    server.use(
      subscriptionHandler(
        buildSubscription({ status: 'CANCELED', incompleteExpiresAt: null }),
      ),
    );
    renderSubscription();

    expect(
      await screen.findByRole('link', { name: 'Contratar un plan de nuevo' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: '¿Qué incluye tu plan?' }),
    ).not.toBeInTheDocument();
  });
});
