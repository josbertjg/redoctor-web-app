import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { todayInCaracas } from '@/app/lib/format/date-of-birth';
import { formatCalendarDate } from '@/app/lib/format/dates';
import { pageNamespaces } from '@/app/lib/i18n/client-messages';
import { meResponseSchema, toAccount } from '@/app/lib/schemas/identity';

import { Toaster } from '@/app/ui/toast';
import {
  buildInvoice,
  buildStartedPayment,
  buildSubscription,
  intentIds,
  planIds,
  usd,
  ves,
} from '@/tests/factories/billing';
import { renderWithPageMessages } from '@/tests/render';

import { SessionContext, type Session } from '@/app/hooks/use-session';

import { PayFlow } from './pay-flow';
import { buildOffices } from '../../../tests/factories/agenda';
import { buildSpecialistMeResponse } from '../../../tests/factories/identity';
import { apiUrl, errorEnvelope } from '../../../tests/msw/api-url';
import {
  invoicesHandler,
  planChangeHandlers,
  subscriptionHandler,
} from '../../../tests/msw/handlers/billing';
import { validToken } from '../../../tests/msw/handlers/identity';
import { server } from '../../../tests/msw/server';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/panel/subscription/pay',
}));

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

function renderPay(plan: string | null = null, plans = false) {
  return renderWithPageMessages(
    <QueryClientProvider client={queryClient()}>
      <SessionContext.Provider value={signedIn}>
        {/* As the page renders it: inside its main landmark. */}
        <main>
          <PayFlow request={{ plan, plans }} />
        </main>
      </SessionContext.Provider>
      <Toaster regionLabel="Notificaciones" closeLabel="Cerrar" />
    </QueryClientProvider>,
    pageNamespaces.pay,
  );
}

/**
 * The bodies the API received on a path, in order. Read at `request:start`:
 * by `request:match` the handler has consumed the body and a clone throws.
 */
function recordBodies(path: string) {
  const bodies: unknown[] = [];
  server.events.on('request:start', ({ request }) => {
    if (
      request.method === 'POST' &&
      new URL(request.url).pathname.endsWith(path)
    ) {
      void request
        .clone()
        .json()
        .then((body: unknown) => bodies.push(body));
    }
  });
  return bodies;
}

const unpaidSubscription = () => [
  subscriptionHandler(buildSubscription()),
  invoicesHandler([buildInvoice()]),
];

const noDialog = () =>
  waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

async function pickBank(query: string, label: string) {
  await userEvent.click(screen.getByRole('button', { name: /Banco usado/ }));
  const picker = await screen.findByRole('dialog', {
    name: '¿Qué banco usaste?',
  });
  await userEvent.type(
    within(picker).getByLabelText('Busca tu banco aquí'),
    query,
  );
  await userEvent.click(within(picker).getByRole('button', { name: label }));
  await noDialog();
}

beforeAll(() => {
  // jsdom lays nothing out: the steps scroll to the top on paper only.
  window.scrollTo = vi.fn();
});

afterEach(() => {
  server.events.removeAllListeners();
});

describe('PayFlow', () => {
  it('takes a plan with a coupon and reports a Pago móvil, in two steps', async () => {
    const subscriptions = recordBodies('/billing/me/subscription');
    const reports = recordBodies('/report');
    const { container } = renderPay();

    // Without a plan, the payment page starts on the plans.
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Elige el plan ideal para tu perfil profesional',
      }),
    ).toBeInTheDocument();
    // The cheapest comes chosen; the archived plan is not offered.
    expect(await screen.findAllByRole('radio')).toHaveLength(3);
    expect(screen.getByRole('radio', { name: /Esencial/ })).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: /Profesional/ }));
    const [, professionalToggle] = screen.getAllByRole('button', {
      name: 'Ver beneficios',
    });
    if (!professionalToggle) throw new Error('No second plan to unfold');
    await userEvent.click(professionalToggle);
    expect(screen.getByText('Máximo 3 consultorios')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
    await userEvent.click(
      screen.getByRole('button', { name: 'Seleccionar plan' }),
    );

    // Step 1: the totals and the coupon.
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: '¿Cómo vas a pagar?',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Paso 1 de 2')).toBeInTheDocument();
    expect(screen.getByText('Plan Profesional')).toBeInTheDocument();
    expect(screen.getAllByText('$ 30')).toHaveLength(2);

    await userEvent.click(
      screen.getByRole('button', { name: 'Añadir cupones' }),
    );
    const sheet = await screen.findByRole('dialog', { name: 'Añadir cupones' });
    await userEvent.type(within(sheet).getByLabelText('Código'), 'redoctor20');
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
    await noDialog();
    expect(screen.getByText('REDOCTOR20')).toBeInTheDocument();
    expect(screen.getByText('(20 %)')).toBeInTheDocument();
    expect(screen.getByText('- $ 6')).toBeInTheDocument();
    expect(screen.getByText('$ 24')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Pago móvil' }));

    // Step 2: the amount, Redoctor's account and the report.
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Realiza el pago' }),
    ).toBeInTheDocument();
    expect(subscriptions).toEqual([
      { planId: planIds.professional, coupon: { code: 'REDOCTOR20' } },
    ]);
    expect(screen.getByText('Paso 2 de 2')).toBeInTheDocument();
    expect(screen.getByText('Bs 1.198,39')).toBeInTheDocument();
    expect(
      screen.getByText('Equivale a $ 30 · Tasa del día Bs 39,95'),
    ).toBeInTheDocument();
    // «hasta la 1:15» or «hasta las 3:15»: the article follows the hour.
    expect(screen.getByText(/Este monto vale hasta las? /)).toBeInTheDocument();
    expect(screen.getByText('(0102) Banco de Venezuela')).toBeInTheDocument();
    expect(screen.getByText('04141234567')).toBeInTheDocument();
    expect(screen.getByText('J-123456789')).toBeInTheDocument();
    expect(screen.getByLabelText('Monto en bolívares')).toHaveValue('1198,39');

    await userEvent.type(
      screen.getByLabelText('Número de referencia'),
      '00123456',
    );
    await pickBank('banesco', '(0134) Banesco');
    expect(
      screen.getByRole('button', { name: /\(0134\) Banesco/ }),
    ).toBeInTheDocument();
    await userEvent.type(
      screen.getByLabelText('Número de teléfono'),
      '4141234567',
    );
    expect(await axe(container)).toHaveNoViolations();
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Estamos verificando tu pago',
      }),
    ).toBeInTheDocument();
    const today = todayInCaracas();
    expect(reports).toEqual([
      {
        reference: '00123456',
        bankCode: '0134',
        origin: '+584141234567',
        paidOn: today,
        amountVes: 119839,
      },
    ]);
    expect(screen.getByText('Bs 1.198,39')).toBeInTheDocument();
    expect(screen.getByText('(0134) Banesco')).toBeInTheDocument();
    expect(screen.getByText('Pago móvil')).toBeInTheDocument();
    expect(screen.getByText(formatCalendarDate(today))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir al inicio' })).toHaveAttribute(
      'href',
      '/panel',
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('pays an unpaid subscription by transfer, explaining a different amount first', async () => {
    const reports = recordBodies('/report');
    server.use(...unpaidSubscription());
    const { container } = renderPay();

    // A receipt owed: the payment page starts on paying it.
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: '¿Cómo vas a pagar?',
      }),
    ).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
    expect(
      screen.getByText('Plan Profesional · 12 oct – 11 nov 2026'),
    ).toBeInTheDocument();
    expect(screen.getByText('Total a pagar')).toBeInTheDocument();
    expect(screen.queryByText('Añadir cupones')).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: 'Transferencia' }),
    );
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Realiza el pago' }),
    ).toBeInTheDocument();
    expect(screen.getByText('01020123456789012345')).toBeInTheDocument();
    expect(screen.getByText('Redoctor C.A.')).toBeInTheDocument();
    expect(screen.getByText('Corriente')).toBeInTheDocument();

    await userEvent.type(
      screen.getByLabelText('Número de referencia'),
      '987654321',
    );
    await pickBank('mercantil', '(0105) Banco Mercantil');
    await userEvent.type(screen.getByLabelText('Cuenta de origen'), '1234');
    const amount = screen.getByLabelText('Monto en bolívares');
    await userEvent.clear(amount);
    await userEvent.type(amount, '1000');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    const sheet = await screen.findByRole('dialog', {
      name: 'Pagaste otro monto',
    });
    expect(
      within(sheet).getByText(
        'Vas a reportar Bs 1.000,00, y tu recibo pedía Bs 1.198,39.',
      ),
    ).toBeInTheDocument();
    expect(
      within(sheet).getByText(/Lo que falte quedará pendiente/),
    ).toBeInTheDocument();
    await userEvent.click(
      within(sheet).getByRole('button', { name: 'Enviar así' }),
    );

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Estamos verificando tu pago',
      }),
    ).toBeInTheDocument();
    expect(reports).toEqual([
      expect.objectContaining({
        reference: '987654321',
        bankCode: '0105',
        origin: '1234',
        amountVes: 100000,
      }),
    ]);
    expect(screen.getByText('Bs 1.000,00')).toBeInTheDocument();
    expect(screen.getByText('Transferencia')).toBeInTheDocument();
  });

  it('activates the plan at once when a coupon covers the month', async () => {
    renderPay();

    await userEvent.click(
      await screen.findByRole('radio', { name: /Profesional/ }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Seleccionar plan' }),
    );
    await userEvent.click(
      await screen.findByRole('button', { name: 'Añadir cupones' }),
    );
    const sheet = await screen.findByRole('dialog', { name: 'Añadir cupones' });
    await userEvent.type(within(sheet).getByLabelText('Código'), 'GRATIS100');
    await userEvent.click(
      within(sheet).getByRole('button', { name: 'Ver descuento' }),
    );
    await userEvent.click(
      await within(sheet).findByRole('button', { name: 'Aplicar cupón' }),
    );
    await noDialog();

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Tu cupón cubre este mes completo',
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Pago móvil' }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Activar mi plan' }),
    );

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: '¡Tu plan ha sido activado!',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Tu cupón GRATIS100 cubrió el 100 % del plan Profesional/,
      ),
    ).toBeInTheDocument();
  });

  it('renews an expired amount in bolívares and keeps what was typed', async () => {
    let starts = 0;
    const reports = recordBodies('/report');
    server.use(
      ...unpaidSubscription(),
      http.post(
        apiUrl('/billing/me/invoices/:invoiceId/payment-intents'),
        () => {
          starts += 1;
          return HttpResponse.json(
            buildStartedPayment('MOBILE_PAYMENT', {
              id: starts === 1 ? intentIds.expired : intentIds.fresh,
              amountVes: starts === 1 ? ves(119839) : ves(125000),
            }),
            { status: 201 },
          );
        },
      ),
    );
    renderPay();

    await userEvent.click(
      await screen.findByRole('button', { name: 'Pago móvil' }),
    );
    await screen.findByRole('heading', { level: 1, name: 'Realiza el pago' });
    await userEvent.type(
      screen.getByLabelText('Número de referencia'),
      '00123456',
    );
    await pickBank('banesco', '(0134) Banesco');
    await userEvent.type(
      screen.getByLabelText('Número de teléfono'),
      '4141234567',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(
      await screen.findByText(
        'El monto en bolívares cambió. Revísalo y confirma de nuevo.',
      ),
    ).toBeInTheDocument();
    expect(await screen.findByText('Bs 1.250,00')).toBeInTheDocument();
    expect(screen.getByLabelText('Número de referencia')).toHaveValue(
      '00123456',
    );
    expect(reports).toHaveLength(1);

    // The typed amount no longer matches the new one: the sheet asks, as the app does.
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    const sheet = await screen.findByRole('dialog', {
      name: 'Pagaste otro monto',
    });
    expect(
      within(sheet).getByText(
        'Vas a reportar Bs 1.198,39, y tu recibo pedía Bs 1.250,00.',
      ),
    ).toBeInTheDocument();
    await userEvent.click(
      within(sheet).getByRole('button', { name: 'Enviar así' }),
    );
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Estamos verificando tu pago',
      }),
    ).toBeInTheDocument();
    expect(reports).toHaveLength(2);
    expect(reports[1]).toEqual(expect.objectContaining({ amountVes: 119839 }));
  });

  it('says when the subscription cannot be read and offers to try again', async () => {
    server.use(
      http.get(apiUrl('/billing/me/subscription'), () =>
        HttpResponse.json(errorEnvelope('ERR_1002', 'Validation failed'), {
          status: 400,
        }),
      ),
    );
    renderPay();

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
        name: 'Elige el plan ideal para tu perfil profesional',
      }),
    ).toBeInTheDocument();
  });

  it('says a plan up to date has nothing to pay, and leads to it', async () => {
    server.use(
      subscriptionHandler(
        buildSubscription({ status: 'ACTIVE', incompleteExpiresAt: null }),
      ),
    );
    renderPay();

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Tu plan está al día',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Ver mi suscripción' }),
    ).toHaveAttribute('href', '/panel/subscription');
  });

  it('goes back to the subscription from the plans', async () => {
    renderPay();

    await userEvent.click(
      await screen.findByRole('button', { name: 'Mi suscripción' }),
    );
    expect(router.push).toHaveBeenCalledWith('/panel/subscription');
  });

  it('tells an account the API does not take for a specialist’s', async () => {
    server.use(
      http.get(apiUrl('/billing/me/subscription'), () =>
        HttpResponse.json(errorEnvelope('ERR_1003', 'Forbidden'), {
          status: 403,
        }),
      ),
    );
    renderPay();

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

describe('PayFlow, changing plan (?plan=)', () => {
  const essential = {
    id: planIds.essential,
    slug: 'esencial',
    name: 'Esencial',
  };
  const corporate = {
    id: planIds.corporate,
    slug: 'corporativo',
    name: 'Corporativo',
  };
  const activeOn = (
    plan: { id: string; slug: string; name: string },
    price: number,
    overrides: Parameters<typeof buildSubscription>[0] = {},
  ) =>
    subscriptionHandler(
      buildSubscription({
        status: 'ACTIVE',
        incompleteExpiresAt: null,
        plan,
        price: usd(price),
        ...overrides,
      }),
    );

  it('upgrades to the plan a link asks for, then pays the difference', async () => {
    server.use(activeOn(essential, 1500));
    const changes = recordBodies('/change-plan');
    const intents = recordBodies('/payment-intents');
    const { container } = renderPay('profesional');

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Cambiar al plan Profesional',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Ahora pagas solo la parte del mes que te queda/),
    ).toBeInTheDocument();
    const today = screen.getByRole('region', { name: 'Lo que vas a pagar' });
    expect(
      within(today).getByText('Tiempo sin usar del plan Esencial'),
    ).toBeInTheDocument();
    expect(within(today).getByText('- $ 13,55')).toBeInTheDocument();
    expect(within(today).getAllByText('$ 13,55')).toHaveLength(1);
    expect(
      screen.getByText(/Hoy tienes el plan Esencial\./),
    ).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();

    await userEvent.click(
      screen.getByRole('button', { name: 'Cambiar y pagar' }),
    );

    // The difference is paid as any receipt: the payment's two steps.
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: '¿Cómo vas a pagar?',
      }),
    ).toBeInTheDocument();
    expect(changes).toEqual([{ planId: planIds.professional }]);
    expect(screen.getByText('Plan Profesional')).toBeInTheDocument();
    expect(screen.getByText('Total a pagar')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Pago móvil' }));
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Realiza el pago',
      }),
    ).toBeInTheDocument();
    expect(intents).toEqual([{ method: 'MOBILE_PAYMENT' }]);
  });

  it('asks to accept the coupon’s loss before changing', async () => {
    server.use(
      activeOn(essential, 1500, {
        discount: {
          code: 'REDOCTOR20',
          couponName: 'Bienvenida 2026',
          discountType: 'PERCENT',
          percentOff: 20,
          amountOff: null,
          duration: 'FOREVER',
          remainingCycles: null,
          status: 'ACTIVE',
        },
      }),
      ...planChangeHandlers({ discountEffect: 'ENDS' }),
    );
    const changes = recordBodies('/change-plan');
    renderPay('profesional');

    expect(
      await screen.findByText(
        'Tu cupón REDOCTOR20 deja de aplicarse con el cambio.',
      ),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Cambiar y pagar' }),
    );
    expect(
      await screen.findByText('Marca la casilla para confirmar el cambio.'),
    ).toBeInTheDocument();
    expect(changes).toEqual([]);

    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Entiendo que pierdo mi cupón' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Cambiar y pagar' }),
    );
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: '¿Cómo vas a pagar?',
      }),
    ).toBeInTheDocument();
    expect(changes).toEqual([
      { planId: planIds.professional, acceptDiscountLoss: true },
    ]);
  });

  it('says why the API will not change the plan now', async () => {
    server.use(
      activeOn(essential, 1500),
      ...planChangeHandlers({
        refusal: { code: 'ERR_5077', message: 'Plan change not allowed' },
      }),
    );
    renderPay('profesional');

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'No puedes cambiar de plan ahora',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Ese cambio de plan no está disponible en este momento.',
      ),
    ).toBeInTheDocument();
  });

  it('schedules a downgrade for the end of the period', async () => {
    server.use(
      activeOn(corporate, 6000),
      ...planChangeHandlers({ from: planIds.corporate }),
    );
    renderPay('profesional');

    expect(
      await screen.findByText(
        /^Pasarás al plan Profesional el .+\. Hasta entonces/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: 'Lo que vas a pagar' }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Programar el cambio' }),
    );

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /^Pasarás al plan Profesional el /,
      }),
    ).toBeInTheDocument();
  });

  it('keeps the plan, back to the subscription', async () => {
    server.use(activeOn(essential, 1500));
    renderPay('profesional');

    await userEvent.click(
      await screen.findByRole('button', { name: 'Mantener mi plan' }),
    );
    expect(router.push).toHaveBeenCalledWith('/panel/subscription');
  });

  it('opens the plans with the asked one chosen when there is no plan', async () => {
    renderPay('profesional');

    expect(
      await screen.findByRole('radio', { name: /Profesional/ }),
    ).toBeChecked();
  });

  it('starts with the receipt owed, whatever plan a link asks for', async () => {
    server.use(...unpaidSubscription());
    renderPay('corporativo');

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: '¿Cómo vas a pagar?',
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /Cambiar al plan/ }),
    ).not.toBeInTheDocument();
  });
});

describe('PayFlow, «Cambiar de plan» (?view=plans)', () => {
  const essential = {
    id: planIds.essential,
    slug: 'esencial',
    name: 'Esencial',
  };
  const professional = {
    id: planIds.professional,
    slug: 'profesional',
    name: 'Profesional',
  };
  const corporate = {
    id: planIds.corporate,
    slug: 'corporativo',
    name: 'Corporativo',
  };
  const activeOn = (
    plan: { id: string; slug: string; name: string },
    price: number,
    overrides: Parameters<typeof buildSubscription>[0] = {},
  ) =>
    subscriptionHandler(
      buildSubscription({
        status: 'ACTIVE',
        incompleteExpiresAt: null,
        plan,
        price: usd(price),
        ...overrides,
      }),
    );

  it('marks the plan in force and changes to another one', async () => {
    server.use(activeOn(essential, 1500));
    const { container } = renderPay(null, true);

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Cambia tu plan cuando lo necesites',
      }),
    ).toBeInTheDocument();
    const own = await screen.findByRole('radio', { name: /Esencial/ });
    expect(own).toBeChecked();
    expect(own).toHaveAccessibleName(/Tu plan/);
    expect(
      screen.queryByRole('button', { name: 'Cambiar a este plan' }),
    ).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();

    await userEvent.click(screen.getByRole('radio', { name: /Profesional/ }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Cambiar a este plan' }),
    );
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Cambiar al plan Profesional',
      }),
    ).toBeInTheDocument();

    // «Volver» returns to the plans, the choice kept in view.
    await userEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Cambia tu plan cuando lo necesites',
      }),
    ).toBeInTheDocument();
  });

  it('marks a scheduled plan and offers no change to it', async () => {
    server.use(
      activeOn(corporate, 6000, {
        scheduledChange: {
          plan: professional,
          price: usd(3000),
          effectiveAt: '2026-11-12T03:59:59.999Z',
        },
      }),
    );
    renderPay(null, true);

    const scheduled = await screen.findByRole('radio', { name: /Profesional/ });
    expect(scheduled).toHaveAccessibleName(/Próximo mes/);
    await userEvent.click(scheduled);
    expect(
      screen.queryByRole('button', { name: 'Cambiar a este plan' }),
    ).not.toBeInTheDocument();
  });

  it('refuses a downgrade the active offices do not fit', async () => {
    server.use(
      activeOn(corporate, 6000),
      ...planChangeHandlers({ from: planIds.corporate }),
      http.get(apiUrl('/specialists/offices'), () =>
        HttpResponse.json(
          buildOffices([
            { id: 'office-1', name: 'Clínica Canaima' },
            { id: 'office-2', name: 'Torre Sur' },
          ]),
        ),
      ),
    );
    renderPay('esencial');

    expect(
      await screen.findByText(
        'Tienes 2 consultorios activos y el plan Esencial permite 1. Desactiva los que sobran desde la app antes de bajar de plan.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Programar el cambio' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Mantener mi plan' }),
    ).toBeInTheDocument();
  });

  it('leads from a plan up to date to the plans', async () => {
    server.use(activeOn(essential, 1500));
    renderPay();

    await userEvent.click(
      await screen.findByRole('button', { name: 'Cambiar de plan' }),
    );
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Cambia tu plan cuando lo necesites',
      }),
    ).toBeInTheDocument();
  });
});
