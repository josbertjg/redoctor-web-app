// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  buildInvoice,
  buildInvoiceDetail,
  buildIntent,
  buildPlans,
  buildReported,
  buildSubscription,
  hoursFromNow,
  intentIds,
  invoiceIds,
  planIds,
  usd,
} from '@/tests/factories/billing';

import {
  activeDiscount,
  couponAppliesTo,
  couponDiscount,
  couponSchema,
  coversFully,
  currentSubscriptionSchema,
  hasEnded,
  intentInReview,
  invoiceDetailResponseSchema,
  invoiceSchema,
  lastRejected,
  mayOwe,
  offeredPlans,
  paymentReportBodySchema,
  pickPayableInvoice,
  planTier,
  plansResponseSchema,
  subscriptionNotice,
  subscriptionSchema,
  type Subscription,
} from './billing';

const subscription = (
  overrides: Parameters<typeof buildSubscription>[0] = {},
) => subscriptionSchema.parse(buildSubscription(overrides));

const detail = (
  intents: Parameters<typeof buildInvoiceDetail>[1] = [],
  invoice = buildInvoice(),
) =>
  invoiceDetailResponseSchema.parse({
    invoice: buildInvoiceDetail(invoice, intents),
  }).invoice;

describe('plans', () => {
  it('offers the active plans with a current price, the cheapest first', () => {
    const { plans } = plansResponseSchema.parse({ plans: buildPlans() });

    expect(offeredPlans(plans).map((plan) => plan.name)).toEqual([
      'Esencial',
      'Profesional',
      'Corporativo',
    ]);
  });

  it('ranks a plan by its slug, as the app paints the crown', () => {
    expect(planTier('corporativo')).toBe('gold');
    expect(planTier('plan-profesional')).toBe('silver');
    expect(planTier('esencial')).toBe('bronze');
    expect(planTier('whatever-comes')).toBe('bronze');
  });
});

describe('subscription', () => {
  it('parses what the API answers and keeps an unknown status inert', () => {
    const current = currentSubscriptionSchema.parse({
      subscription: buildSubscription({ status: 'SOMETHING_NEW' }),
      access: { hasAccess: false, status: null },
    });
    expect(current.subscription?.status).toBe('UNKNOWN');

    const none = currentSubscriptionSchema.parse({
      subscription: null,
      access: { hasAccess: false },
    });
    expect(none.subscription).toBeNull();
  });

  it('tells an ended subscription, and one that may owe a receipt', () => {
    expect(hasEnded(subscription({ status: 'CANCELED' }))).toBe(true);
    expect(hasEnded(subscription({ status: 'INCOMPLETE_EXPIRED' }))).toBe(true);
    expect(hasEnded(subscription({ status: 'ACTIVE' }))).toBe(false);

    expect(mayOwe(subscription())).toBe(true);
    expect(mayOwe(subscription({ status: 'PAST_DUE' }))).toBe(true);
    expect(mayOwe(subscription({ status: 'ACTIVE' }))).toBe(false);
    expect(
      mayOwe(
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
      ),
    ).toBe(true);
    expect(mayOwe(subscription({ status: 'CANCELED' }))).toBe(false);
  });

  it('only counts a discount that still applies', () => {
    const discount = {
      code: 'REDOCTOR20',
      discountType: 'PERCENT' as const,
      percentOff: 20,
      duration: 'ONCE' as const,
    };
    expect(
      activeDiscount(
        subscription({ discount: { ...discount, status: 'ACTIVE' } }),
      )?.code,
    ).toBe('REDOCTOR20');
    expect(
      activeDiscount(
        subscription({ discount: { ...discount, status: 'ENDED' } }),
      ),
    ).toBeNull();
  });
});

describe('receipts and attempts', () => {
  it('picks the oldest open receipt of the subscription, as the app does', () => {
    const invoices = [
      buildInvoice({ id: 'newest', status: 'OPEN' }),
      buildInvoice({ id: 'paid', status: 'PAID', pending: usd(0) }),
      buildInvoice({ id: 'oldest', status: 'OPEN' }),
      buildInvoice({ id: 'another', status: 'OPEN', subscriptionId: 'other' }),
    ].map((invoice) => invoiceSchema.parse(invoice));

    expect(pickPayableInvoice(invoices, subscription())?.id).toBe('oldest');
    expect(pickPayableInvoice([], subscription())).toBeNull();
  });

  it('finds the attempt an admin still has to decide', () => {
    expect(intentInReview(detail())).toBeNull();
    expect(
      intentInReview(detail([buildIntent({ status: 'PROCESSING' })]))?.status,
    ).toBe('PROCESSING');
  });

  it('keeps a rejection as the last thing that happened, under a newer unreported attempt', () => {
    const intents = detail([
      buildIntent({ id: intentIds.fresh }),
      buildIntent({
        id: intentIds.rejected,
        status: 'FAILED',
        reported: buildReported(),
        failureReason: 'La referencia no aparece.',
      }),
    ]);
    expect(lastRejected(intents)?.id).toBe(intentIds.rejected);

    const paidLater = detail([
      buildIntent({ status: 'SUCCEEDED', reported: buildReported() }),
      buildIntent({
        id: intentIds.rejected,
        status: 'FAILED',
        reported: buildReported(),
      }),
    ]);
    expect(lastRejected(paidLater)).toBeNull();
  });
});

describe('coupons', () => {
  const coupon = (overrides: Record<string, unknown> = {}) =>
    couponSchema.parse({
      code: 'X',
      name: 'X',
      discountType: 'PERCENT',
      percentOff: 20,
      duration: 'ONCE',
      planIds: [],
      ...overrides,
    });

  it('takes a share or an amount off, never more than the price', () => {
    expect(couponDiscount(coupon(), usd(3000))).toEqual(usd(600));
    expect(couponDiscount(coupon({ percentOff: 33 }), usd(1999))).toEqual(
      usd(660),
    );
    expect(
      couponDiscount(
        coupon({ discountType: 'AMOUNT', amountOff: usd(500) }),
        usd(3000),
      ),
    ).toEqual(usd(500));
    expect(
      couponDiscount(
        coupon({ discountType: 'AMOUNT', amountOff: usd(9000) }),
        usd(3000),
      ),
    ).toEqual(usd(3000));
    // Another currency takes nothing off.
    expect(
      couponDiscount(
        coupon({
          discountType: 'AMOUNT',
          amountOff: { amount: 500, currency: 'VES' },
        }),
        usd(3000),
      ),
    ).toEqual(usd(0));
  });

  it('knows when it leaves the first receipt at zero, and which plans it is for', () => {
    expect(coversFully(coupon({ percentOff: 100 }), usd(3000))).toBe(true);
    expect(coversFully(coupon(), usd(3000))).toBe(false);
    expect(couponAppliesTo(coupon(), planIds.essential)).toBe(true);
    expect(
      couponAppliesTo(
        coupon({ planIds: [planIds.professional] }),
        planIds.essential,
      ),
    ).toBe(false);
  });
});

describe('paymentReportBodySchema', () => {
  it('takes only what the API expects', () => {
    expect(
      paymentReportBodySchema.safeParse({
        reference: '00123456',
        bankCode: '0134',
        origin: '+584141234567',
        paidOn: '2026-10-12',
        amountVes: 119839,
      }).success,
    ).toBe(true);
    expect(
      paymentReportBodySchema.safeParse({
        reference: '00123456',
        bankCode: '134',
        origin: '+584141234567',
        paidOn: '2026-10-12',
        amountVes: 119839,
      }).success,
    ).toBe(false);
    expect(
      paymentReportBodySchema.safeParse({
        reference: '00123456',
        bankCode: '0134',
        origin: '+584141234567',
        paidOn: '2026-10-12',
        amountVes: 0,
      }).success,
    ).toBe(false);
  });
});

describe('subscriptionNotice', () => {
  const now = new Date();
  const notice = (
    overrides: Parameters<typeof buildSubscription>[0],
    payable: ReturnType<typeof detail> | null = null,
  ) =>
    subscriptionNotice({ subscription: subscription(overrides), payable, now });

  it('says nothing without a subscription, or once it ended, or when all is paid', () => {
    expect(
      subscriptionNotice({ subscription: null, payable: null, now }),
    ).toBeNull();
    expect(notice({ status: 'CANCELED' })).toBeNull();
    expect(notice({ status: 'INCOMPLETE_EXPIRED' })).toBeNull();
    expect(notice({ status: 'ACTIVE', incompleteExpiresAt: null })).toBeNull();
  });

  it('counts the days to an unpaid subscription’s deadline', () => {
    const result = notice({ incompleteExpiresAt: hoursFromNow(60) });
    expect(result?.kind).toBe('unpaid');
    expect(result?.days).toBeGreaterThanOrEqual(2);
    expect(result?.days).toBeLessThanOrEqual(3);

    expect(notice({ incompleteExpiresAt: hoursFromNow(-5) })?.days).toBe(0);
    expect(notice({ incompleteExpiresAt: null })?.deadline).toBeNull();
  });

  it('puts a payment in review before anything else', () => {
    const inReview = detail([
      buildIntent({ status: 'IN_REVIEW', reported: buildReported() }),
    ]);
    expect(notice({}, inReview)?.kind).toBe('inReview');
    expect(
      notice(
        {
          status: 'PAST_DUE',
          incompleteExpiresAt: null,
          graceEndsAt: hoursFromNow(120),
        },
        inReview,
      )?.kind,
    ).toBe('inReview');
  });

  it('keeps the rejection’s reason under a past-due plan, and tells a rejected first payment', () => {
    const rejected = detail([
      buildIntent({
        status: 'FAILED',
        reported: buildReported(),
        failureReason: '  La referencia no aparece.  ',
      }),
    ]);

    const pastDue = notice(
      {
        status: 'PAST_DUE',
        incompleteExpiresAt: null,
        graceEndsAt: hoursFromNow(5 * 24),
      },
      rejected,
    );
    expect(pastDue).toMatchObject({
      kind: 'pastDue',
      days: 5,
      rejectionReason: 'La referencia no aparece.',
    });

    expect(notice({}, rejected)).toMatchObject({
      kind: 'rejected',
      rejectionReason: 'La referencia no aparece.',
    });
  });

  it('tells an upgrade waiting for its difference, rejected or not', () => {
    const upgrading: Parameters<typeof buildSubscription>[0] = {
      status: 'ACTIVE',
      incompleteExpiresAt: null,
      pendingUpgrade: {
        plan: {
          id: planIds.corporate,
          slug: 'corporativo',
          name: 'Corporativo',
        },
        invoiceId: invoiceIds.upgrade,
      },
    };
    expect(notice(upgrading)).toMatchObject({
      kind: 'upgradePending',
      planName: 'Corporativo',
    });

    const rejectedUpgrade = detail(
      [
        buildIntent({
          status: 'FAILED',
          reported: buildReported(),
          failureReason: 'Monto distinto.',
        }),
      ],
      buildInvoice({ id: invoiceIds.upgrade, kind: 'PRORATION' }),
    );
    expect(notice(upgrading, rejectedUpgrade)?.kind).toBe('rejected');
  });

  it('types the subscription it reads', () => {
    const typed: Subscription = subscription();
    expect(typed.plan.name).toBe('Profesional');
  });
});
