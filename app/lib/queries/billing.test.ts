// @vitest-environment node
import { QueryClient } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import {
  buildInvoice,
  buildIntent,
  buildReported,
  buildSubscription,
  intentIds,
  invoiceIds,
  planIds,
  usd,
} from '@/tests/factories/billing';

import {
  couponRejectionKey,
  payableInvoiceQueryOptions,
  plansQueryOptions,
  reportPayment,
  resolvePayable,
  subscribe,
  validateCoupon,
} from './billing';
import { apiUrl, errorEnvelope } from '../../../tests/msw/api-url';
import {
  invoiceDetailHandler,
  invoicesHandler,
  subscriptionHandler,
} from '../../../tests/msw/handlers/billing';
import { validToken } from '../../../tests/msw/handlers/identity';
import { server } from '../../../tests/msw/server';
import { ApiError } from '../api/errors';
import {
  offeredPlans,
  plansResponseSchema,
  subscriptionSchema,
} from '../schemas/billing';

const user = { id: 'uid-1', getToken: () => Promise.resolve(validToken) };

const plan = () => {
  const { plans } = plansResponseSchema.parse({
    plans: [
      {
        id: planIds.professional,
        slug: 'profesional',
        name: 'Profesional',
        maxActiveClinics: 3,
        canExportReports: true,
        status: 'ACTIVE',
        price: { id: 'p', amount: usd(3000), status: 'ACTIVE' },
      },
    ],
  });
  const [offered] = offeredPlans(plans);
  if (!offered) throw new Error('no plan');
  return offered;
};

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

describe('subscribe', () => {
  it('creates the subscription with its first receipt, the coupon inside', async () => {
    const result = await subscribe(user, {
      plan: plan(),
      coupon: { code: 'REDOCTOR20' },
      free: false,
    });

    expect(result.subscription.status).toBe('INCOMPLETE');
    expect(result.subscription.discount?.code).toBe('REDOCTOR20');
    expect(result.invoice?.pending).toEqual(usd(2400));
    expect(result.invoice?.intents).toEqual([]);
  });

  it('answers no receipt when a coupon covers the month: the plan is active', async () => {
    const result = await subscribe(user, {
      plan: plan(),
      coupon: { code: 'GRATIS100' },
      free: true,
    });

    expect(result.subscription.status).toBe('ACTIVE');
    expect(result.invoice).toBeNull();
  });

  it('goes on with the unpaid subscription of this plan when the API says there is one', async () => {
    server.use(
      http.post(apiUrl('/billing/me/subscription'), () =>
        HttpResponse.json(errorEnvelope('ERR_5071', 'Already subscribed'), {
          status: 409,
        }),
      ),
      subscriptionHandler(buildSubscription()),
      invoicesHandler([buildInvoice()]),
    );

    const result = await subscribe(user, {
      plan: plan(),
      coupon: null,
      free: false,
    });

    expect(result.subscription.id).toBe(buildSubscription().id);
    expect(result.invoice?.id).toBe(invoiceIds.unpaid);
  });

  it('refuses when the subscription on the way is another plan’s', async () => {
    server.use(
      http.post(apiUrl('/billing/me/subscription'), () =>
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
      subscribe(user, { plan: plan(), coupon: null, free: false }),
    ).rejects.toMatchObject({ code: 'ERR_5071' });
  });

  it('passes on a plan that is no longer offered', async () => {
    await expect(
      subscribe(user, {
        plan: { ...plan(), id: planIds.archived },
        coupon: null,
        free: false,
      }),
    ).rejects.toMatchObject({ code: 'ERR_5074' });
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
          path: '/x',
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
          path: '/x',
          status: 409,
          code: 'ERR_5109',
        }),
      ),
    ).toBe('billing.couponRejection.unavailable');
    expect(
      couponRejectionKey(
        new ApiError({ kind: 'network', method: 'POST', path: '/x' }),
      ),
    ).toBeNull();
    expect(couponRejectionKey(new Error('other'))).toBeNull();
  });
});
