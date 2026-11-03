// @vitest-environment node
import { QueryClient } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import {
  buildBalanceMovement,
  buildInvoice,
  buildIntent,
  buildPaidInvoice,
  buildProrationInvoice,
  buildReported,
  buildSubscription,
  couponCodes,
  intentIds,
  invoiceIds,
  planIds,
  quoteIdFor,
  savedCouponId,
  toVes,
  usd,
  ves,
} from '@/tests/factories/billing';

import {
  applyCoupon,
  balanceQueryOptions,
  billingAccountQueryOptions,
  changePlan,
  changeSubscription,
  checkoutQuoteQueryOptions,
  confirmCheckout,
  couponRejectionKey,
  invoiceQueryOptions,
  invoicesQueryOptions,
  myCouponsQueryOptions,
  payableInvoiceQueryOptions,
  planChangePreviewQueryOptions,
  plansQueryOptions,
  reportPayment,
  resolvePayable,
  saveCoupon,
  savedCouponsQueryOptions,
  upgradeQuoteQueryOptions,
  validateCoupon,
} from './billing';
import { apiUrl, errorEnvelope } from '../../../tests/msw/api-url';
import {
  applyDiscountHandler,
  balanceHandler,
  invoiceDetailHandler,
  invoicesHandler,
  planChangeHandlers,
  subscriptionActionHandlers,
  subscriptionHandler,
} from '../../../tests/msw/handlers/billing';
import { validToken } from '../../../tests/msw/handlers/identity';
import { server } from '../../../tests/msw/server';
import { ApiError } from '../api/errors';
import { subscriptionSchema } from '../schemas/billing';

const user = { id: 'uid-1', getToken: () => Promise.resolve(validToken) };

const subscription = (
  overrides: Parameters<typeof buildSubscription>[0] = {},
) => subscriptionSchema.parse(buildSubscription(overrides));

describe('plansQueryOptions', () => {
  it('reads the plans on offer, the cheapest first', async () => {
    const plans = await new QueryClient().query(plansQueryOptions(user));

    expect(plans.map((candidate) => candidate.slug)).toEqual([
      'esencial',
      'profesional',
      'corporativo',
    ]);
  });
});

describe('resolvePayable', () => {
  it('reads nothing for a plan that owes nothing', async () => {
    await expect(
      resolvePayable(user, subscription({ status: 'ACTIVE' })),
    ).resolves.toBeNull();
    expect(
      payableInvoiceQueryOptions(user, subscription({ status: 'ACTIVE' }))
        .enabled,
    ).toBe(false);
  });

  it('reads the oldest open receipt of an unpaid subscription, with its attempts', async () => {
    server.use(
      invoicesHandler([
        buildInvoice({ id: 'newer', status: 'OPEN' }),
        buildInvoice(),
      ]),
      invoiceDetailHandler(buildInvoice(), [
        buildIntent({ status: 'IN_REVIEW', reported: buildReported() }),
      ]),
    );

    const payable = await resolvePayable(user, subscription());

    expect(payable?.id).toBe(invoiceIds.unpaid);
    expect(payable?.intents[0]?.status).toBe('IN_REVIEW');
  });

  it('reads the receipt an upgrade names', async () => {
    server.use(
      invoiceDetailHandler(
        buildInvoice({ id: invoiceIds.upgrade, kind: 'PRORATION' }),
      ),
    );

    const payable = await resolvePayable(
      user,
      subscription({
        status: 'ACTIVE',
        pendingUpgrade: {
          plan: {
            id: planIds.corporate,
            slug: 'corporativo',
            name: 'Corporativo',
          },
          invoiceId: invoiceIds.upgrade,
        },
      }),
    );

    expect(payable?.kind).toBe('PRORATION');
  });

  it('answers none when the open receipts are not this subscription’s', async () => {
    server.use(invoicesHandler([buildInvoice({ subscriptionId: 'other' })]));

    await expect(resolvePayable(user, subscription())).resolves.toBeNull();
  });
});

describe('quoting and confirming a checkout (REDOC-363)', () => {
  const payment = {
    reference: '00123456',
    bankCode: '0134',
    origin: '+584141234567',
    paidOn: '2026-11-02',
    amountVes: toVes(2400),
  };

  /** The `Idempotency-Key` of every confirmation the API received. */
  function recordKeys() {
    const keys: (string | null)[] = [];
    server.events.on('request:start', ({ request }) => {
      if (new URL(request.url).pathname.endsWith('/billing/me/checkout')) {
        keys.push(request.headers.get('idempotency-key'));
      }
    });
    return keys;
  }

  it('quotes a plan with its coupon, creating nothing, in dollars and bolívares', async () => {
    const quote = await new QueryClient().query(
      checkoutQuoteQueryOptions(user, planIds.professional, {
        code: 'REDOCTOR20',
      }),
    );

    expect(quote.id).toBe(quoteIdFor(planIds.professional, 'REDOCTOR20'));
    expect(quote.payable).toEqual(usd(2400));
    expect(quote.payableVes).toEqual(ves(toVes(2400)));
    expect(quote.lines.map((line) => line.type)).toEqual(['PLAN', 'DISCOUNT']);
    expect(quote.requiresPayment).toBe(true);
    expect(quote.destination.mobilePayment?.bankName).toBe(
      'Banco de Venezuela',
    );
  });

  it('confirms the quote with its key and the payment: the plan unpaid, the payment in review', async () => {
    const keys = recordKeys();

    const confirmed = await confirmCheckout(user, {
      planId: planIds.professional,
      quoteId: quoteIdFor(planIds.professional, 'REDOCTOR20'),
      method: 'MOBILE_PAYMENT',
      payment,
      idempotencyKey: 'key-1',
    });

    expect(confirmed.subscription.status).toBe('INCOMPLETE');
    expect(confirmed.intent?.status).toBe('IN_REVIEW');
    expect(keys).toEqual(['key-1']);
  });

  it('confirms without a payment when nothing is to pay: the plan active', async () => {
    const confirmed = await confirmCheckout(user, {
      planId: planIds.professional,
      quoteId: quoteIdFor(planIds.professional, 'GRATIS100'),
      method: null,
      payment: null,
      idempotencyKey: 'key-2',
    });

    expect(confirmed.subscription.status).toBe('ACTIVE');
    expect(confirmed.intent).toBeNull();
  });

  it('counts the same key still being answered as done once the payment is in review', async () => {
    server.use(
      http.post(apiUrl('/billing/me/checkout'), () =>
        HttpResponse.json(errorEnvelope('ERR_1011', 'In progress'), {
          status: 409,
        }),
      ),
      subscriptionHandler(
        buildSubscription({
          openInvoice: {
            id: invoiceIds.unpaid,
            number: 'R-2026-000123',
            kind: 'SUBSCRIPTION_CYCLE',
            total: usd(2400),
            pending: usd(2400),
            dueAt: '2026-11-02T12:00:00.000Z',
          },
          lastPayment: {
            intentId: intentIds.fresh,
            status: 'IN_REVIEW',
            reason: null,
          },
        }),
      ),
    );

    const confirmed = await confirmCheckout(user, {
      planId: planIds.professional,
      quoteId: quoteIdFor(planIds.professional, null),
      method: 'MOBILE_PAYMENT',
      payment,
      idempotencyKey: 'key-3',
    });

    expect(confirmed.subscription.plan.id).toBe(planIds.professional);
  });

  it('counts a quote already used as done when this plan waits with its payment', async () => {
    server.use(
      http.post(apiUrl('/billing/me/checkout'), () =>
        HttpResponse.json(errorEnvelope('ERR_5126', 'Quote used'), {
          status: 409,
        }),
      ),
      subscriptionHandler(buildSubscription()),
      invoicesHandler([buildInvoice()]),
      invoiceDetailHandler(buildInvoice(), [
        buildIntent({ status: 'IN_REVIEW', reported: buildReported() }),
      ]),
    );

    await expect(
      confirmCheckout(user, {
        planId: planIds.professional,
        quoteId: quoteIdFor(planIds.professional, null),
        method: 'MOBILE_PAYMENT',
        payment,
        idempotencyKey: 'key-4',
      }),
    ).resolves.toMatchObject({ subscription: { status: 'INCOMPLETE' } });
  });

  it('passes on a subscription on its way that is another plan’s', async () => {
    server.use(
      http.post(apiUrl('/billing/me/checkout'), () =>
        HttpResponse.json(errorEnvelope('ERR_5071', 'Already subscribed'), {
          status: 409,
        }),
      ),
      subscriptionHandler(
        buildSubscription({
          plan: { id: planIds.essential, slug: 'esencial', name: 'Esencial' },
        }),
      ),
    );

    await expect(
      confirmCheckout(user, {
        planId: planIds.professional,
        quoteId: quoteIdFor(planIds.professional, null),
        method: 'MOBILE_PAYMENT',
        payment,
        idempotencyKey: 'key-5',
      }),
    ).rejects.toMatchObject({ code: 'ERR_5071' });
  });

  it('passes on a changed quote with the new one in its details', async () => {
    server.use(
      http.post(apiUrl('/billing/me/checkout'), () =>
        HttpResponse.json(
          {
            ...errorEnvelope('ERR_5125', 'Quote changed'),
            details: { reason: 'RATE' },
          },
          { status: 409 },
        ),
      ),
    );

    await expect(
      confirmCheckout(user, {
        planId: planIds.professional,
        quoteId: quoteIdFor(planIds.professional, null),
        method: 'MOBILE_PAYMENT',
        payment,
        idempotencyKey: 'key-6',
      }),
    ).rejects.toMatchObject({ code: 'ERR_5125', details: { reason: 'RATE' } });
  });

  it('passes on a plan that is no longer offered', async () => {
    await expect(
      new QueryClient().query(
        checkoutQuoteQueryOptions(user, planIds.archived, null),
      ),
    ).rejects.toMatchObject({ code: 'ERR_5074' });
  });
});

describe('changing plan', () => {
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

  it('previews an upgrade: the difference to pay today', async () => {
    const preview = await new QueryClient().query(
      planChangePreviewQueryOptions(user, planIds.professional),
    );

    expect(preview.kind).toBe('UPGRADE');
    expect(preview.total).toEqual(usd(1355));
  });

  it('upgrades and gets the receipt of the difference to pay', async () => {
    const changed = await changePlan(user, {
      planId: planIds.professional,
      acceptDiscountLoss: false,
    });

    expect(changed.kind).toBe('UPGRADE');
    expect(changed.subscription.pendingUpgrade?.plan.slug).toBe('profesional');
    expect(changed.invoice?.id).toBe(invoiceIds.upgrade);
    expect(changed.invoice?.pending).toEqual(usd(1355));
  });

  it('schedules a downgrade for the period’s end, nothing to pay', async () => {
    server.use(...planChangeHandlers({ from: planIds.corporate }));

    const changed = await changePlan(user, {
      planId: planIds.professional,
      acceptDiscountLoss: false,
    });

    expect(changed.kind).toBe('DOWNGRADE');
    expect(changed.invoice).toBeNull();
    expect(changed.effectiveAt).toBe('2026-11-12T03:59:59.999Z');
  });

  it('sends the coupon’s loss only once accepted', async () => {
    server.use(...planChangeHandlers({ discountEffect: 'ENDS' }));

    await expect(
      changePlan(user, {
        planId: planIds.professional,
        acceptDiscountLoss: false,
      }),
    ).rejects.toMatchObject({ code: 'ERR_5108' });
    await expect(
      changePlan(user, {
        planId: planIds.professional,
        acceptDiscountLoss: true,
      }),
    ).resolves.toMatchObject({ kind: 'UPGRADE' });
  });

  it('counts a conflict as done when this same upgrade is already waiting', async () => {
    server.use(
      ...planChangeHandlers({
        refusal: { code: 'ERR_5075', message: 'Outstanding debt' },
      }),
      subscriptionHandler(
        buildSubscription({
          status: 'ACTIVE',
          plan: essential,
          price: usd(1500),
          incompleteExpiresAt: null,
          pendingUpgrade: { plan: professional, invoiceId: invoiceIds.upgrade },
        }),
      ),
      invoiceDetailHandler(buildProrationInvoice()),
    );

    const changed = await changePlan(user, {
      planId: planIds.professional,
      acceptDiscountLoss: false,
    });

    expect(changed.kind).toBe('UPGRADE');
    expect(changed.invoice?.id).toBe(invoiceIds.upgrade);
  });

  it('passes on a conflict that is not this change', async () => {
    server.use(
      ...planChangeHandlers({
        refusal: { code: 'ERR_5075', message: 'Outstanding debt' },
      }),
      subscriptionHandler(
        buildSubscription({
          status: 'PAST_DUE',
          plan: essential,
          price: usd(1500),
        }),
      ),
    );

    await expect(
      changePlan(user, {
        planId: planIds.professional,
        acceptDiscountLoss: false,
      }),
    ).rejects.toMatchObject({ code: 'ERR_5075' });
  });
});

describe('changing plan on its quote (REDOC-363)', () => {
  it('reads an upgrade’s quote from its preview, in the payment’s shape', async () => {
    const quote = await new QueryClient().query(
      upgradeQuoteQueryOptions(user, planIds.professional),
    );

    expect(quote.payable).toEqual(usd(1355));
    expect(quote.payableVes).toEqual(ves(toVes(1355)));
    expect(quote.lines.map((line) => line.type)).toEqual([
      'PRORATION_CHARGE',
      'PRORATION_CREDIT',
    ]);
  });

  it('says there is no rate when the preview brings no quote', async () => {
    server.use(...planChangeHandlers({ noRate: true }));

    await expect(
      new QueryClient().query(
        upgradeQuoteQueryOptions(user, planIds.professional),
      ),
    ).rejects.toMatchObject({ code: 'ERR_5085' });
  });

  it('reports a quoted upgrade’s payment in the same call', async () => {
    const changed = await changePlan(user, {
      planId: planIds.professional,
      acceptDiscountLoss: false,
      quoted: {
        quoteId: `upgrade-quote:${planIds.professional}`,
        method: 'BANK_TRANSFER',
        payment: {
          reference: '987654321',
          bankCode: '0105',
          origin: '01050000111122223333',
          paidOn: '2026-11-02',
          amountVes: toVes(1355),
        },
      },
    });

    expect(changed.kind).toBe('UPGRADE');
    expect(changed.intent?.status).toBe('IN_REVIEW');
    expect(changed.invoice).toBeNull();
  });

  it('schedules a downgrade that turns offices off only once accepted', async () => {
    server.use(
      ...planChangeHandlers({
        from: planIds.corporate,
        officesToDeactivate: [{ id: 'office-3', name: 'Consultorio Norte' }],
      }),
    );

    await expect(
      changePlan(user, {
        planId: planIds.professional,
        acceptDiscountLoss: false,
      }),
    ).rejects.toMatchObject({ code: 'ERR_5076' });
    await expect(
      changePlan(user, {
        planId: planIds.professional,
        acceptDiscountLoss: false,
        acceptOfficeDeactivation: true,
      }),
    ).resolves.toMatchObject({ kind: 'DOWNGRADE' });
  });
});

describe('changeSubscription', () => {
  const active = (overrides: Parameters<typeof buildSubscription>[0] = {}) =>
    buildSubscription({
      status: 'ACTIVE',
      incompleteExpiresAt: null,
      ...overrides,
    });

  it('drops a scheduled downgrade: the plan renews as it is', async () => {
    const renewed = await changeSubscription(user, 'undoPlanChange');

    expect(renewed.status).toBe('ACTIVE');
    expect(renewed.scheduledChange).toBeNull();
  });

  it('cancels at the period’s end, keeping the plan until then', async () => {
    const canceled = await changeSubscription(user, 'cancel');

    expect(canceled.status).toBe('ACTIVE');
    expect(canceled.cancelAtPeriodEnd).toBe(true);
  });

  it('resumes a plan asked to end', async () => {
    const resumed = await changeSubscription(user, 'resume');

    expect(resumed.cancelAtPeriodEnd).toBe(false);
  });

  it('abandons an unpaid subscription', async () => {
    const abandoned = await changeSubscription(user, 'abandon');

    expect(abandoned.status).toBe('INCOMPLETE_EXPIRED');
  });

  it('counts a conflict as done once the subscription stands where the action leaves it', async () => {
    server.use(
      ...subscriptionActionHandlers({
        refusal: { code: 'ERR_5073', message: 'Invalid transition' },
      }),
      subscriptionHandler(active({ cancelAtPeriodEnd: true })),
    );

    await expect(changeSubscription(user, 'cancel')).resolves.toMatchObject({
      cancelAtPeriodEnd: true,
    });
  });

  it('passes on a conflict that left it elsewhere', async () => {
    server.use(
      ...subscriptionActionHandlers({
        refusal: { code: 'ERR_5073', message: 'Invalid transition' },
      }),
      subscriptionHandler(buildSubscription()),
    );

    await expect(changeSubscription(user, 'abandon')).rejects.toMatchObject({
      code: 'ERR_5073',
    });
  });

  it('counts a conflict on the undo as done once nothing is scheduled', async () => {
    server.use(
      http.delete(apiUrl('/billing/me/subscription/scheduled-change'), () =>
        HttpResponse.json(errorEnvelope('ERR_5073', 'Invalid transition'), {
          status: 409,
        }),
      ),
      subscriptionHandler(active()),
    );

    await expect(
      changeSubscription(user, 'undoPlanChange'),
    ).resolves.toMatchObject({ status: 'ACTIVE', scheduledChange: null });
  });
});

describe('receipts, balance and billing account', () => {
  const receipts = Array.from({ length: 23 }, (_, index) =>
    buildPaidInvoice({
      id: `invoice-${String(index)}`,
      number: `R-2026-${String(index).padStart(6, '0')}`,
    }),
  );

  it('reads the receipts a page at a time, the next one while there is more', async () => {
    server.use(invoicesHandler([buildInvoice(), ...receipts]));
    const client = new QueryClient();

    const first = await client.infiniteQuery(invoicesQueryOptions(user, null));
    const [page] = first.pages;
    expect(page?.items).toHaveLength(20);
    expect(page?.meta).toMatchObject({ page: 1, totalPages: 2 });

    const options = invoicesQueryOptions(user, null);
    expect(page && options.getNextPageParam(page, first.pages, 1, [1])).toBe(2);
  });

  it('keeps one status when filtered', async () => {
    server.use(invoicesHandler([buildInvoice(), ...receipts]));

    const open = await new QueryClient().infiniteQuery(
      invoicesQueryOptions(user, 'open'),
    );
    expect(open.pages[0]?.items.map((invoice) => invoice.status)).toEqual([
      'OPEN',
    ]);
  });

  it('reads one receipt with its payments, attempts and adjustments', async () => {
    server.use(
      invoiceDetailHandler(buildPaidInvoice(), [], {
        allocations: [
          {
            paymentId: 'payment-1',
            amount: usd(3000),
            paymentAmountVes: { amount: 119839, currency: 'VES' },
            rate: '39.94633333',
            confirmedAt: '2026-09-13T15:00:00.000Z',
          },
        ],
      }),
    );

    const receipt = await new QueryClient().query(
      invoiceQueryOptions(user, buildPaidInvoice().id),
    );
    expect(receipt.allocations).toHaveLength(1);
    expect(receipt.adjustments).toEqual([]);
    expect(receipt.billingData?.legalName).toBe('Luis Gómez');
  });

  it('answers a receipt that does not exist with its 404, for the page to say it', async () => {
    await expect(
      new QueryClient().query(invoiceQueryOptions(user, 'not-a-receipt')),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('reads the balance with its movements', async () => {
    server.use(balanceHandler(500, [buildBalanceMovement()]));

    const balance = await new QueryClient().infiniteQuery(
      balanceQueryOptions(user),
    );
    expect(balance.pages[0]?.balance).toEqual(usd(500));
    expect(balance.pages[0]?.items[0]?.type).toBe('CREDIT');
  });

  it('reads whom the receipts are issued to', async () => {
    const account = await new QueryClient().query(
      billingAccountQueryOptions(user),
    );
    expect(account).toMatchObject({
      legalName: 'Luis Gómez',
      documentType: 'V',
      status: 'ACTIVE',
    });
  });
});

describe('reportPayment', () => {
  const body = {
    reference: '00123456',
    bankCode: '0134',
    origin: '+584141234567',
    paidOn: '2026-10-12',
    amountVes: 119839,
  };

  it('reports the payment and gets the attempt back, in review', async () => {
    const intent = await reportPayment(
      user,
      { id: intentIds.fresh, invoiceId: invoiceIds.unpaid },
      body,
    );

    expect(intent.status).toBe('IN_REVIEW');
    expect(intent.reported?.reference).toBe('00123456');
  });

  it('counts «already in review» as done when it is this report that landed', async () => {
    server.use(
      invoiceDetailHandler(buildInvoice(), [
        buildIntent({
          id: intentIds.inReview,
          status: 'IN_REVIEW',
          reported: buildReported(),
        }),
      ]),
    );

    const intent = await reportPayment(
      user,
      { id: intentIds.inReview, invoiceId: invoiceIds.unpaid },
      body,
    );

    expect(intent.id).toBe(intentIds.inReview);
  });

  it('passes on «already in review» when another report is the one waiting', async () => {
    server.use(
      invoiceDetailHandler(buildInvoice(), [
        buildIntent({
          id: intentIds.inReview,
          status: 'IN_REVIEW',
          reported: { ...buildReported(), reference: 'another' },
        }),
      ]),
    );

    await expect(
      reportPayment(
        user,
        { id: intentIds.inReview, invoiceId: invoiceIds.unpaid },
        body,
      ),
    ).rejects.toMatchObject({ code: 'ERR_5084' });
  });

  it('passes on an expired amount for the flow to renew it', async () => {
    await expect(
      reportPayment(
        user,
        { id: intentIds.expired, invoiceId: invoiceIds.unpaid },
        body,
      ),
    ).rejects.toMatchObject({ code: 'ERR_5083' });
  });
});

describe('coupons', () => {
  it('validates a code as typed, trimmed and upper case', async () => {
    const coupon = await validateCoupon(
      user,
      ' redoctor20 ',
      planIds.professional,
    );
    expect(coupon.code).toBe('REDOCTOR20');
    expect(coupon.percentOff).toBe(20);
  });

  it('names the API’s refusals in the app’s words, the reason before the code', async () => {
    await expect(
      validateCoupon(user, 'VENCIDO', planIds.professional),
    ).rejects.toSatisfy(
      (error) =>
        couponRejectionKey(error) === 'billing.couponRejection.expired',
    );
    await expect(
      validateCoupon(user, 'NADA', planIds.professional),
    ).rejects.toSatisfy(
      (error) =>
        couponRejectionKey(error) === 'billing.couponRejection.invalid',
    );
    await expect(
      validateCoupon(user, 'SOLOPRO', planIds.essential),
    ).rejects.toSatisfy(
      (error) =>
        couponRejectionKey(error) === 'billing.couponRejection.wrongPlan',
    );

    expect(
      couponRejectionKey(
        new ApiError({
          kind: 'http',
          method: 'POST',
          path: '/billing/me/checkout/quote',
          status: 409,
          code: 'ERR_5104',
          details: { reason: 'FIRST_SUBSCRIPTION_ONLY' },
        }),
      ),
    ).toBe('billing.couponRejection.firstSubscriptionOnly');
    expect(
      couponRejectionKey(
        new ApiError({
          kind: 'http',
          method: 'POST',
          path: '/billing/me/coupons/validate',
          status: 409,
          code: 'ERR_5109',
        }),
      ),
    ).toBe('billing.couponRejection.unavailable');
    // A receipt or an attempt that is gone says nothing of the coupon.
    expect(
      couponRejectionKey(
        new ApiError({
          kind: 'http',
          method: 'POST',
          path: '/billing/me/invoices/:invoiceId/payment-intents',
          status: 404,
        }),
      ),
    ).toBeNull();
    expect(
      couponRejectionKey(
        new ApiError({ kind: 'network', method: 'POST', path: '/x' }),
      ),
    ).toBeNull();
    expect(couponRejectionKey(new Error('other'))).toBeNull();
  });
});

describe('«Mis cupones» and a coupon on the plan in force', () => {
  const active = (overrides: Parameters<typeof buildSubscription>[0] = {}) =>
    buildSubscription({
      status: 'ACTIVE',
      incompleteExpiresAt: null,
      ...overrides,
    });

  it('lists every coupon, the ones still to use first; the picker keeps only those', async () => {
    server.use(
      http.get(apiUrl('/billing/me/coupons'), () =>
        HttpResponse.json({
          items: [
            {
              code: 'USADO10',
              name: 'Usado',
              discountType: 'PERCENT',
              percentOff: 10,
              amountOff: null,
              duration: 'ONCE',
              durationMonths: null,
              planIds: [],
              expiresAt: null,
              personal: false,
              savedCouponId: 'saved-used',
              state: 'USED',
              savedAt: '2026-09-01T12:00:00.000Z',
            },
            {
              code: 'REDOCTOR20',
              name: 'Bienvenida 2026',
              discountType: 'PERCENT',
              percentOff: 20,
              amountOff: null,
              duration: 'ONCE',
              durationMonths: null,
              planIds: [],
              expiresAt: null,
              personal: false,
              savedCouponId: 'saved-available',
              state: 'AVAILABLE',
              savedAt: '2026-10-01T12:00:00.000Z',
            },
          ],
        }),
      ),
    );
    const client = new QueryClient();

    const all = await client.query(myCouponsQueryOptions(user));
    expect(all.map((coupon) => coupon.state)).toEqual(['AVAILABLE', 'USED']);

    const available = savedCouponsQueryOptions(user).select?.(all) ?? [];
    expect(available.map((coupon) => coupon.code)).toEqual(['REDOCTOR20']);
  });

  it('saves a code without spending it', async () => {
    const saved = await saveCoupon(user, couponCodes.twentyOff);

    expect(saved).toMatchObject({ code: 'REDOCTOR20', state: 'AVAILABLE' });
  });

  it('names why a code cannot be saved in the app’s words', async () => {
    await expect(saveCoupon(user, couponCodes.expired)).rejects.toSatisfy(
      (error) =>
        couponRejectionKey(error) === 'billing.couponRejection.expired',
    );
  });

  it('applies a typed code or a saved coupon to the plan in force', async () => {
    await expect(
      applyCoupon(user, {
        choice: { code: couponCodes.twentyOff },
        code: couponCodes.twentyOff,
      }),
    ).resolves.toMatchObject({ code: 'REDOCTOR20', status: 'ACTIVE' });
    await expect(
      applyCoupon(user, {
        choice: { savedCouponId },
        code: couponCodes.professionalOnly,
      }),
    ).resolves.toMatchObject({ code: 'SOLOPRO' });
  });

  it('counts «one already discounting» as done when it is this coupon', async () => {
    server.use(
      applyDiscountHandler({ active: true }),
      subscriptionHandler(
        active({
          discount: {
            couponName: 'Bienvenida 2026',
            code: 'REDOCTOR20',
            discountType: 'PERCENT',
            percentOff: 20,
            amountOff: null,
            duration: 'ONCE',
            remainingCycles: 1,
            status: 'ACTIVE',
          },
        }),
      ),
    );

    await expect(
      applyCoupon(user, {
        choice: { code: couponCodes.twentyOff },
        code: couponCodes.twentyOff,
      }),
    ).resolves.toMatchObject({ code: 'REDOCTOR20' });
  });

  it('passes on «one already discounting» when it is another', async () => {
    server.use(
      applyDiscountHandler({ active: true }),
      subscriptionHandler(
        active({
          discount: {
            couponName: 'Otro',
            code: 'OTRO50',
            discountType: 'PERCENT',
            percentOff: 50,
            amountOff: null,
            duration: 'ONCE',
            remainingCycles: 1,
            status: 'ACTIVE',
          },
        }),
      ),
    );

    await expect(
      applyCoupon(user, {
        choice: { code: couponCodes.twentyOff },
        code: couponCodes.twentyOff,
      }),
    ).rejects.toMatchObject({ code: 'ERR_5106' });
  });
});
