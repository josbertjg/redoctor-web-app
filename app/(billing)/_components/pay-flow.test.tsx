import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  readPaymentDraft,
  savePaymentDraft,
  type PaymentDraft,
} from '@/app/lib/billing/payment-draft';
import { todayInCaracas } from '@/app/lib/format/date-of-birth';
import { formatCalendarDate } from '@/app/lib/format/dates';
import { pageNamespaces } from '@/app/lib/i18n/client-messages';
import {
  checkoutQuoteViewSchema,
  toPaymentQuote,
} from '@/app/lib/schemas/billing';
import { meResponseSchema, toAccount } from '@/app/lib/schemas/identity';

import { Toaster } from '@/app/ui/toast';
import {
  buildCheckoutQuote,
  buildInvoice,
  buildStartedPayment,
  buildSubscription,
  destination,
  intentIds,
  planIds,
  quoteIdFor,
  usd,
  ves,
} from '@/tests/factories/billing';
import { renderWithPageMessages } from '@/tests/render';

import { SessionContext, type Session } from '@/app/hooks/use-session';

import { PayFlow } from './pay-flow';
import { buildSpecialistMeResponse } from '../../../tests/factories/identity';
import { apiUrl, errorEnvelope } from '../../../tests/msw/api-url';
import {
  checkoutAnswer,
  invoiceDetailHandler,
  invoicesHandler,
  planChangeHandlers,
  subscriptionHandler,
  supportHandler,
} from '../../../tests/msw/handlers/billing';
import { validToken } from '../../../tests/msw/handlers/identity';
import { server } from '../../../tests/msw/server';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/pay',
  useSearchParams: () => new URLSearchParams(),
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
  addSignOutTask: () => () => undefined,
  firebaseReady: true,
  prepareSignIn: () => undefined,
};

/** As app/providers.tsx builds it: no retries, so a failure shows at once. */
const queryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

function renderPay(
  plan: string | null = null,
  plans = false,
  invoice: string | null = null,
) {
  return renderWithPageMessages(
    <QueryClientProvider client={queryClient()}>
      <SessionContext.Provider value={signedIn}>
        {/* As the page renders it: inside its main landmark. */}
        <main>
          <PayFlow request={{ plan, plans, invoice }} />
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

/** One request header the API received on a path, in order. */
function recordHeader(path: string, header: string) {
  const values: (string | null)[] = [];
  server.events.on('request:start', ({ request }) => {
    if (
      request.method === 'POST' &&
      new URL(request.url).pathname.endsWith(path)
    ) {
      values.push(request.headers.get(header));
    }
  });
  return values;
}

const professional = {
  id: planIds.professional,
  slug: 'profesional',
  name: 'Profesional',
  price: 3000,
};

/** A quote of the professional plan, in the payment's shape. */
const quoteOf = (
  overrides: Parameters<typeof buildCheckoutQuote>[0] = { plan: professional },
) =>
  toPaymentQuote(checkoutQuoteViewSchema.parse(buildCheckoutQuote(overrides)));

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
  // A payment left halfway in one test is no other test's.
  window.localStorage.clear();
});

describe('PayFlow', () => {
  it('quotes a plan with a coupon, then takes it and reports a Pago móvil at «Confirmar»', async () => {
    const quotes = recordBodies('/checkout/quote');
    const checkouts = recordBodies('/billing/me/checkout');
    const keys = recordHeader('/billing/me/checkout', 'idempotency-key');
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

    // Step 1: the quote, made as the plan opens; nothing is created yet.
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: '¿Cómo vas a pagar?',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Paso 1 de 2')).toBeInTheDocument();
    expect(screen.getByText('Plan Profesional')).toBeInTheDocument();
    expect(await screen.findAllByText('$ 30')).toHaveLength(2);
    expect(
      screen.getByText('Bs 1.198,39 con la tasa del día (Bs 39,95)'),
    ).toBeInTheDocument();

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
    await userEvent.click(
      within(sheet).getByRole('button', { name: 'Aplicar cupón' }),
    );
    await noDialog();
    // Quoted again with the coupon: its line, and the new total in bolívares.
    expect(await screen.findByText('- $ 6')).toBeInTheDocument();
    expect(screen.getByText('REDOCTOR20')).toBeInTheDocument();
    expect(screen.getByText('(20 %)')).toBeInTheDocument();
    expect(screen.getByText('$ 24')).toBeInTheDocument();
    expect(
      screen.getByText('Bs 958,71 con la tasa del día (Bs 39,95)'),
    ).toBeInTheDocument();
    expect(quotes).toEqual([
      { planId: planIds.professional },
      { planId: planIds.professional, coupon: { code: 'REDOCTOR20' } },
    ]);

    await userEvent.click(screen.getByRole('button', { name: 'Pago móvil' }));

    // Step 2: the quote's amount and account, still nothing created.
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Realiza el pago' }),
    ).toBeInTheDocument();
    expect(checkouts).toEqual([]);
    expect(screen.getByText('Paso 2 de 2')).toBeInTheDocument();
    expect(screen.getByText('Bs 958,71')).toBeInTheDocument();
    expect(
      screen.getByText('Equivale a $ 24 · Tasa del día Bs 39,95'),
    ).toBeInTheDocument();
    // A quote does not expire with the hour: no «vale hasta».
    expect(screen.queryByText(/Este monto vale hasta/)).not.toBeInTheDocument();
    expect(screen.getByText('(0102) Banco de Venezuela')).toBeInTheDocument();
    expect(screen.getByText('04141234567')).toBeInTheDocument();
    expect(screen.getByLabelText('Monto en bolívares')).toHaveValue('958,71');

    await userEvent.type(
      screen.getByLabelText('Número de referencia'),
      '00123456',
    );
    await pickBank('banesco', '(0134) Banesco');
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
    // The plan taken and its payment reported in one call, with its key.
    expect(checkouts).toEqual([
      {
        quoteId: quoteIdFor(planIds.professional, 'REDOCTOR20'),
        method: 'MOBILE_PAYMENT',
        payment: {
          reference: '00123456',
          bankCode: '0134',
          origin: '+584141234567',
          paidOn: today,
          amountVes: 95871,
        },
      },
    ]);
    expect(keys).toHaveLength(1);
    expect(keys[0]).toMatch(/^[0-9a-f-]{36}$/);
    expect(screen.getByText('Bs 958,71')).toBeInTheDocument();
    expect(screen.getByText('(0134) Banesco')).toBeInTheDocument();
    expect(screen.getByText('Pago móvil')).toBeInTheDocument();
    expect(screen.getByText(formatCalendarDate(today))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir al inicio' })).toHaveAttribute(
      'href',
      '/panel',
    );
    // Nothing left halfway once the payment is reported.
    expect(readPaymentDraft(user.id)).toBeNull();
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
    const checkouts = recordBodies('/billing/me/checkout');
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
      await screen.findByRole('heading', {
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
    // Nothing to pay: the quote alone.
    expect(checkouts).toEqual([
      { quoteId: quoteIdFor(planIds.professional, 'GRATIS100') },
    ]);
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

  it('upgrades to the plan a link asks for, paying the difference at «Confirmar»', async () => {
    server.use(activeOn(essential, 1500));
    const changes = recordBodies('/change-plan');
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
      within(today).getByText('Bs 541,27 con la tasa del día (Bs 39,95)'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Hoy tienes el plan Esencial\./),
    ).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();

    await userEvent.click(
      screen.getByRole('button', { name: 'Cambiar y pagar' }),
    );

    // The difference is paid in the payment's two steps, on the preview's
    // quote: nothing is written until «Confirmar».
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: '¿Cómo vas a pagar?',
      }),
    ).toBeInTheDocument();
    expect(changes).toEqual([]);
    expect(screen.getByText('Plan Profesional')).toBeInTheDocument();
    expect(screen.getByText('Total a pagar')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Pago móvil' }));
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Realiza el pago',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Bs 541,27')).toBeInTheDocument();
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
      await screen.findByRole('heading', {
        level: 1,
        name: 'Estamos verificando tu pago',
      }),
    ).toBeInTheDocument();
    expect(changes).toEqual([
      {
        planId: planIds.professional,
        quoteId: `upgrade-quote:${planIds.professional}`,
        method: 'MOBILE_PAYMENT',
        payment: expect.objectContaining({ amountVes: 54127 }) as unknown,
      },
    ]);
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

    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Entiendo que pierdo mi cupón' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Cambiar y pagar' }),
    );
    await userEvent.click(
      await screen.findByRole('button', { name: 'Transferencia' }),
    );
    await userEvent.type(
      await screen.findByLabelText('Número de referencia'),
      '987654321',
    );
    await pickBank('mercantil', '(0105) Banco Mercantil');
    await userEvent.type(screen.getByLabelText('Cuenta de origen'), '1234');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Estamos verificando tu pago',
      }),
    ).toBeInTheDocument();
    // The loss accepted travels with the change and its payment.
    expect(changes).toEqual([
      expect.objectContaining({
        planId: planIds.professional,
        acceptDiscountLoss: true,
        method: 'BANK_TRANSFER',
      }),
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

  it('names the offices a downgrade turns off and asks to accept it', async () => {
    server.use(
      activeOn(corporate, 6000),
      ...planChangeHandlers({
        from: planIds.corporate,
        officesToDeactivate: [{ id: 'office-2', name: 'Torre Sur' }],
      }),
    );
    const changes = recordBodies('/change-plan');
    const { container } = renderPay('esencial');

    expect(
      await screen.findByText('Al bajar de plan se desactivará un consultorio'),
    ).toBeInTheDocument();
    expect(screen.getByText('Torre Sur')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
    await userEvent.click(
      screen.getByRole('button', { name: 'Programar el cambio' }),
    );
    expect(
      await screen.findByText(
        'Marca la casilla para poder programar el cambio.',
      ),
    ).toBeInTheDocument();
    expect(changes).toEqual([]);

    await userEvent.click(
      screen.getByRole('checkbox', {
        name: 'Acepto que se desactiven al empezar el plan Esencial',
      }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Programar el cambio' }),
    );
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /Pasarás al plan Esencial/,
      }),
    ).toBeInTheDocument();
    expect(changes).toEqual([
      { planId: planIds.essential, acceptOfficeDeactivation: true },
    ]);
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

describe('PayFlow, a receipt chosen on its page (?invoice=)', () => {
  /** An active plan whose renewal is issued and not due yet: nothing owed by the page's own reading. */
  const renewal = buildInvoice({
    id: 'renewal-receipt',
    number: 'R-2026-000130',
    total: usd(3000),
    pending: usd(3000),
  });
  const active = () =>
    buildSubscription({ status: 'ACTIVE', incompleteExpiresAt: null });

  it('pays that receipt, and goes back to it', async () => {
    server.use(subscriptionHandler(active()), invoiceDetailHandler(renewal));
    renderPay(null, false, renewal.id);

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: '¿Cómo vas a pagar?',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Plan Profesional')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(router.push).toHaveBeenCalledWith(
      '/panel/subscription/invoices/renewal-receipt',
    );
  });

  it('says there is nothing to pay on a receipt already paid', async () => {
    server.use(
      subscriptionHandler(active()),
      invoiceDetailHandler(
        buildInvoice({
          id: renewal.id,
          status: 'PAID',
          paid: usd(3000),
          pending: usd(0),
        }),
      ),
    );
    renderPay(null, false, renewal.id);

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'No tienes pagos pendientes',
      }),
    ).toBeInTheDocument();
  });
});

describe('PayFlow, on a quote (REDOC-363)', () => {
  /** Opens the professional plan from the plans, to its first step. */
  async function openProfessional() {
    await userEvent.click(
      await screen.findByRole('radio', { name: /Profesional/ }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Seleccionar plan' }),
    );
    await screen.findByRole('heading', {
      level: 1,
      name: '¿Cómo vas a pagar?',
    });
  }

  async function fillPagoMovil() {
    await userEvent.click(
      await screen.findByRole('button', { name: 'Pago móvil' }),
    );
    await userEvent.type(
      await screen.findByLabelText('Número de referencia'),
      '00123456',
    );
    await pickBank('banesco', '(0134) Banesco');
    await userEvent.type(
      screen.getByLabelText('Número de teléfono'),
      '4141234567',
    );
  }

  /** `POST /billing/me/checkout` that first answers ERR_5125 with `next`, then takes it. */
  function changedOnce(
    reason: string,
    next: ReturnType<typeof buildCheckoutQuote>,
  ) {
    let calls = 0;
    return http.post(apiUrl('/billing/me/checkout'), async ({ request }) => {
      calls += 1;
      if (calls === 1) {
        return HttpResponse.json(
          {
            ...errorEnvelope('ERR_5125', 'Quote changed'),
            details: { reason, quote: next },
          },
          { status: 409 },
        );
      }
      const body = (await request.json()) as {
        method?: 'MOBILE_PAYMENT' | 'BANK_TRANSFER';
        payment?: Parameters<typeof checkoutAnswer>[2];
      };
      return HttpResponse.json(
        checkoutAnswer(next, body.method, body.payment),
        { status: 201 },
      );
    });
  }

  it('confirms again by itself when the new quote charges the same', async () => {
    const checkouts = recordBodies('/billing/me/checkout');
    const keys = recordHeader('/billing/me/checkout', 'idempotency-key');
    server.use(
      changedOnce(
        'EXPIRED',
        buildCheckoutQuote({ plan: professional, version: 2 }),
      ),
    );
    renderPay();
    await openProfessional();
    await fillPagoMovil();
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Estamos verificando tu pago',
      }),
    ).toBeInTheDocument();
    // No sheet: the price of today is the one the person saw.
    expect(screen.queryByText('El precio venció')).not.toBeInTheDocument();
    expect(checkouts).toEqual([
      expect.objectContaining({
        quoteId: quoteIdFor(planIds.professional, null, 1),
      }),
      expect.objectContaining({
        quoteId: quoteIdFor(planIds.professional, null, 2),
      }),
    ]);
    // Another body, another key.
    expect(new Set(keys).size).toBe(2);
  });

  it('says the rate changed, keeps the amount paid and reports it with the new quote', async () => {
    const checkouts = recordBodies('/billing/me/checkout');
    const next = buildCheckoutQuote({
      plan: professional,
      version: 2,
      quoteRate: '41.00000000',
    });
    server.use(changedOnce('RATE', next));
    const { container } = renderPay();
    await openProfessional();
    await fillPagoMovil();
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    const sheet = await screen.findByRole('dialog', {
      name: 'La tasa del día cambió',
    });
    expect(
      within(sheet).getByText(
        'La tasa cambió antes del día de tu pago, así que actualizamos el precio de tu plan: ahora son Bs 1.230,00. Antes eran Bs 1.198,39.',
      ),
    ).toBeInTheDocument();
    expect(
      within(sheet).getByText(
        'Puedes reportar lo que pagaste: antes de enviarlo te contamos qué pasa con la diferencia.',
      ),
    ).toBeInTheDocument();
    // Support one tap away, from the API's lines.
    expect(
      within(sheet).getByRole('link', {
        name: 'Escribir por WhatsApp a Redoctor, +58 424 0000002',
      }),
    ).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
    await userEvent.click(
      within(sheet).getByRole('button', { name: 'Entendido' }),
    );
    await noDialog();

    // The figure of today is shown; what was paid stays in the report.
    expect(screen.getByText('Bs 1.230,00')).toBeInTheDocument();
    expect(screen.getByLabelText('Monto en bolívares')).toHaveValue('1198,39');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    const other = await screen.findByRole('dialog', {
      name: 'Pagaste otro monto',
    });
    await userEvent.click(
      within(other).getByRole('button', { name: 'Enviar así' }),
    );

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Estamos verificando tu pago',
      }),
    ).toBeInTheDocument();
    expect(checkouts.at(-1)).toEqual(
      expect.objectContaining({
        quoteId: quoteIdFor(planIds.professional, null, 2),
        payment: expect.objectContaining({ amountVes: 119839 }) as unknown,
      }),
    );
  });

  it('keeps what was typed when the person goes back to choose how to pay', async () => {
    renderPay();
    await openProfessional();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Pago móvil' }),
    );
    await userEvent.type(
      await screen.findByLabelText('Número de referencia'),
      '00123456',
    );
    await userEvent.type(
      screen.getByLabelText('Número de teléfono'),
      '4141234567',
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Cambiar la forma de pago' }),
    );
    await userEvent.click(
      await screen.findByRole('button', { name: 'Transferencia' }),
    );

    // The reference stays; a phone is no account, so the origin starts empty.
    expect(await screen.findByLabelText('Número de referencia')).toHaveValue(
      '00123456',
    );
    expect(screen.getByLabelText('Cuenta de origen')).toHaveValue('');
  });

  it('offers only the ways to pay there is an account for', async () => {
    server.use(
      http.post(apiUrl('/billing/me/checkout/quote'), () =>
        HttpResponse.json(
          buildCheckoutQuote({
            plan: professional,
            destinationOverride: { ...destination, mobilePayment: null },
          }),
        ),
      ),
    );
    renderPay();
    await openProfessional();

    expect(
      await screen.findByRole('button', { name: 'Transferencia' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Pago móvil' }),
    ).not.toBeInTheDocument();
  });

  it('with no way to pay configured, says so and leads to support', async () => {
    server.use(
      http.post(apiUrl('/billing/me/checkout/quote'), () =>
        HttpResponse.json(
          buildCheckoutQuote({
            plan: professional,
            destinationOverride: { mobilePayment: null, bankTransfer: null },
          }),
        ),
      ),
    );
    renderPay();
    await openProfessional();

    expect(
      await screen.findByText('Ahora mismo no hay formas de pago disponibles.'),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('link', {
        name: 'Escribir por WhatsApp a Redoctor, +58 424 0000002',
      }),
    ).toBeInTheDocument();
  });

  it('hides the way to support when nobody filled its lines', async () => {
    server.use(
      supportHandler({ supportCallPhones: [], supportWhatsappPhones: [] }),
      http.post(apiUrl('/billing/me/checkout/quote'), () =>
        HttpResponse.json(
          buildCheckoutQuote({
            plan: professional,
            destinationOverride: { mobilePayment: null, bankTransfer: null },
          }),
        ),
      ),
    );
    renderPay();
    await openProfessional();

    expect(
      await screen.findByText('Ahora mismo no hay formas de pago disponibles.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /WhatsApp/ }),
    ).not.toBeInTheDocument();
  });

  it('says there is no rate to quote with, and tries again', async () => {
    let calls = 0;
    server.use(
      http.post(apiUrl('/billing/me/checkout/quote'), () => {
        calls += 1;
        // The client tries a 503 twice more by itself before saying it.
        return calls <= 3
          ? HttpResponse.json(errorEnvelope('ERR_5085', 'No rate'), {
              status: 503,
            })
          : HttpResponse.json(buildCheckoutQuote({ plan: professional }));
      }),
    );
    renderPay();
    await openProfessional();

    expect(
      await screen.findByText(
        'No podemos calcular el monto en bolívares ahora. Vuelve a intentarlo en un rato.',
        undefined,
        // After the client's own two retries, with their backoff.
        { timeout: 4000 },
      ),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(
      await screen.findByRole('button', { name: 'Pago móvil' }),
    ).toBeInTheDocument();
  });

  it('says a plan can be taken once the identity is approved', async () => {
    server.use(
      http.post(apiUrl('/billing/me/checkout/quote'), () =>
        HttpResponse.json(errorEnvelope('ERR_5128', 'Identity not approved'), {
          status: 403,
        }),
      ),
    );
    renderPay();
    await openProfessional();

    expect(
      await screen.findByText(
        'Podrás contratar un plan cuando aprobemos tu identidad.',
      ),
    ).toBeInTheDocument();
  });

  /** A draft of the professional plan, left on the payment's second step. */
  function leftHalfway(overrides: Partial<PaymentDraft> = {}): PaymentDraft {
    return {
      userId: user.id,
      kind: 'contract',
      planId: planIds.professional,
      planName: 'Profesional',
      coupon: null,
      acceptDiscountLoss: false,
      quote: quoteOf(),
      heldQuotes: [],
      method: 'MOBILE_PAYMENT',
      step: 'pay',
      report: {
        reference: '00123456',
        bankCode: '0134',
        origin: '4141234567',
        paidOn: null,
        amountVes: null,
      },
      idempotency: null,
      savedAt: new Date().toISOString(),
      ...overrides,
    };
  }

  it('takes a payment left halfway up again where it was, with its quote', async () => {
    const checkouts = recordBodies('/billing/me/checkout');
    savePaymentDraft(leftHalfway());
    renderPay();

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Tienes un pago a medias',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Sigue con el plan Profesional donde lo dejaste, con el precio de hoy.',
      ),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Seguir donde lo dejé' }),
    );

    // Back on paying, what was typed still there.
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Realiza el pago' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Número de referencia')).toHaveValue(
      '00123456',
    );
    expect(screen.getByLabelText('Número de teléfono')).toHaveValue(
      '4141234567',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Estamos verificando tu pago',
      }),
    ).toBeInTheDocument();
    expect(checkouts).toEqual([
      expect.objectContaining({
        quoteId: quoteIdFor(planIds.professional, null, 1),
      }),
    ]);
  });

  it('a payment left halfway at another rate: today’s price, and the quote from then for what was paid', async () => {
    const checkouts = recordBodies('/billing/me/checkout');
    const before = quoteOf({
      plan: professional,
      version: 7,
      quoteRate: '38.00000000',
    });
    savePaymentDraft(leftHalfway({ quote: before }));
    renderPay();

    await userEvent.click(
      await screen.findByRole('button', { name: 'Seguir donde lo dejé' }),
    );
    const sheet = await screen.findByRole('dialog', {
      name: 'La tasa del día cambió',
    });
    expect(
      within(sheet).getByText(
        'Si ya pagaste, reporta el monto que transferiste. Lo revisamos con la fecha de tu pago.',
      ),
    ).toBeInTheDocument();
    expect(
      within(sheet).getByText(
        'Si todavía no has pagado, transfiere el monto nuevo.',
      ),
    ).toBeInTheDocument();
    await userEvent.click(
      within(sheet).getByRole('button', { name: 'Entendido' }),
    );
    await noDialog();

    // The amount of then, which the person said they paid.
    expect(screen.getByLabelText('Monto en bolívares')).toHaveValue('1140,00');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Estamos verificando tu pago',
      }),
    ).toBeInTheDocument();
    // Confirmed with the quote from then: the API honours it by the day paid.
    expect(checkouts).toEqual([
      expect.objectContaining({
        quoteId: quoteIdFor(planIds.professional, null, 7),
        payment: expect.objectContaining({ amountVes: 114000 }) as unknown,
      }),
    ]);
  });
});
