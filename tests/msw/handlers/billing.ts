import { http, HttpResponse } from 'msw';

import {
  couponChoiceSchema,
  couponDiscount,
  couponSchema,
  couponValidationBodySchema,
  paymentReportBodySchema,
  planChangeBodySchema,
  saveCouponBodySchema,
  startPaymentBodySchema,
  subscribeBodySchema,
} from '@/app/lib/schemas/billing';

import {
  buildBillingAccount,
  buildInvoice,
  buildInvoiceDetail,
  buildIntent,
  buildPlans,
  buildProrationInvoice,
  buildSavedCoupons,
  buildStartedPayment,
  buildSubscription,
  couponCodes,
  intentIds,
  invoiceIds,
  knownCoupons,
  periodEnd,
  planIds,
  savedCouponId,
  usd,
  type BalanceMovementPayload,
  type BillingAccountPayload,
  type IntentPayload,
  type InvoiceDetailPayload,
  type InvoicePayload,
  type SubscriptionPayload,
} from '../../factories/billing';
import { apiUrl, errorEnvelope } from '../api-url';
import { badRequest, isStranger, unauthorized } from './identity';

const conflict = (code: string, message: string, reason?: string) =>
  HttpResponse.json(
    {
      ...errorEnvelope(code, message),
      ...(reason ? { details: { reason } } : {}),
    },
    { status: 409 },
  );

/** `GET /billing/me/subscription` answering the given subscription (none by default). */
export function subscriptionHandler(
  subscription: SubscriptionPayload | null,
  hasAccess = subscription?.status === 'ACTIVE' ||
    subscription?.status === 'PAST_DUE',
) {
  return http.get(apiUrl('/billing/me/subscription'), ({ request }) =>
    isStranger(request)
      ? unauthorized()
      : HttpResponse.json({
          subscription,
          access: { hasAccess, status: subscription?.status ?? null },
        }),
  );
}

/** One page of a list as the API counts it (`page`, `limit`). */
function pageOf<T>(request: Request, items: readonly T[]) {
  const params = new URL(request.url).searchParams;
  const limit = Number(params.get('limit') ?? 20) || 20;
  const page = Number(params.get('page') ?? 1) || 1;
  return {
    items: items.slice((page - 1) * limit, page * limit),
    meta: {
      total: items.length,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(items.length / limit)),
    },
  };
}

/** `GET /billing/me/invoices`, the newest first, filtered by status and paged as the API does. */
export function invoicesHandler(items: InvoicePayload[]) {
  return http.get(apiUrl('/billing/me/invoices'), ({ request }) => {
    if (isStranger(request)) return unauthorized();
    const status = new URL(request.url).searchParams.get('status');
    const matching = status
      ? items.filter((invoice) => invoice.status === status)
      : items;
    return HttpResponse.json(pageOf(request, matching));
  });
}

/** `GET /billing/me/invoices/{id}` for one receipt with its attempts, the newest first. */
export function invoiceDetailHandler(
  invoice: InvoicePayload,
  intents: IntentPayload[] = [],
  extras: Pick<
    Partial<InvoiceDetailPayload>,
    'allocations' | 'adjustments'
  > = {},
) {
  return http.get(
    apiUrl('/billing/me/invoices/:invoiceId'),
    ({ request, params }) => {
      if (isStranger(request)) return unauthorized();
      if (params.invoiceId !== invoice.id) {
        return HttpResponse.json(
          errorEnvelope('ERR_5080', 'Invoice not found'),
          { status: 404 },
        );
      }
      return HttpResponse.json({
        invoice: { ...buildInvoiceDetail(invoice, intents), ...extras },
      });
    },
  );
}

/** `GET /billing/me/balance`: the balance and its movements, the newest first, paged. */
export function balanceHandler(
  amount: number,
  movements: BalanceMovementPayload[] = [],
) {
  return http.get(apiUrl('/billing/me/balance'), ({ request }) =>
    isStranger(request)
      ? unauthorized()
      : HttpResponse.json({
          balance: usd(amount),
          ...pageOf(request, movements),
        }),
  );
}

/** `GET /billing/me/account`: whom the receipts are issued to. */
export function billingAccountHandler(
  account: BillingAccountPayload = buildBillingAccount(),
) {
  return http.get(apiUrl('/billing/me/account'), ({ request }) =>
    isStranger(request) ? unauthorized() : HttpResponse.json({ account }),
  );
}

/**
 * `POST …/cancel`, `…/resume` and `…/abandon` on an active subscription to
 * the professional plan (an unpaid one for `abandon`): each answers the
 * subscription as it stays. `refusal` answers them all with that conflict.
 */
export function subscriptionActionHandlers({
  refusal = null,
}: { refusal?: { code: string; message: string } | null } = {}) {
  const active = (overrides: Partial<SubscriptionPayload> = {}) =>
    buildSubscription({
      status: 'ACTIVE',
      incompleteExpiresAt: null,
      ...overrides,
    });
  const answer =
    (subscription: () => SubscriptionPayload) =>
    ({ request }: { request: Request }) => {
      if (isStranger(request)) return unauthorized();
      if (refusal) return conflict(refusal.code, refusal.message);
      return HttpResponse.json({ subscription: subscription() });
    };
  return [
    http.post(
      apiUrl('/billing/me/subscription/cancel'),
      answer(() => active({ cancelAtPeriodEnd: true, endsAt: periodEnd })),
    ),
    http.post(
      apiUrl('/billing/me/subscription/resume'),
      answer(() => active()),
    ),
    http.post(
      apiUrl('/billing/me/subscription/abandon'),
      answer(() =>
        buildSubscription({
          status: 'INCOMPLETE_EXPIRED',
          incompleteExpiresAt: null,
        }),
      ),
    ),
  ];
}

/**
 * `POST /billing/me/subscription/discount` on a plan in force (`planId`):
 * a code or a saved coupon, refused as the API refuses it — one already
 * discounting (`active`) answers ERR_5106.
 */
export function applyDiscountHandler({
  planId = planIds.professional,
  active = false,
}: { planId?: string; active?: boolean } = {}) {
  return http.post(
    apiUrl('/billing/me/subscription/discount'),
    async ({ request }) => {
      if (isStranger(request)) return unauthorized();
      const body = couponChoiceSchema.safeParse(await request.json());
      if (!body.success) return badRequest();
      if (active) return conflict('ERR_5106', 'Discount already active');
      const code =
        'code' in body.data
          ? body.data.code
          : body.data.savedCouponId === savedCouponId
            ? couponCodes.professionalOnly
            : 'UNKNOWN';
      const refusal = couponResponse(code, planId);
      if (refusal) return refusal;
      const terms = knownCoupons[code];
      return HttpResponse.json({
        discount: {
          id: '7a7a7a7a-7a7a-4a7a-8a7a-7a7a7a7a7a7a',
          couponName: terms?.name ?? code,
          code,
          discountType: terms?.discountType ?? 'PERCENT',
          percentOff: terms?.percentOff ?? null,
          amountOff: terms?.amountOff ?? null,
          duration: terms?.duration ?? 'ONCE',
          remainingCycles: 1,
          status: 'ACTIVE',
          endReason: null,
        },
      });
    },
  );
}

/** What a coupon code answers: its terms, or the API's refusal. */
function couponResponse(code: string, planId: string | undefined) {
  if (code === couponCodes.expired) {
    return conflict('ERR_5103', 'Coupon expired', 'EXPIRED');
  }
  const coupon = knownCoupons[code];
  if (!coupon) {
    return HttpResponse.json(errorEnvelope('ERR_5101', 'Coupon not found'), {
      status: 422,
    });
  }
  const planIdsOf = coupon.planIds ?? [];
  if (planId && planIdsOf.length > 0 && !planIdsOf.includes(planId)) {
    return conflict(
      'ERR_5105',
      'Coupon not for this plan',
      'PLAN_NOT_ELIGIBLE',
    );
  }
  return null;
}

/**
 * `GET …/change-plan/preview` and `POST …/change-plan`, as the API answers
 * them for an active subscription to `from` (the essential plan): up to a
 * pricier plan with the receipt of the difference, down to a cheaper one
 * at the period's end. `refusal` answers both with that conflict; a coupon
 * that `ENDS` with the change refuses it until its loss is accepted.
 */
export function planChangeHandlers({
  from = planIds.essential,
  discountEffect = 'NONE',
  refusal = null,
}: {
  from?: string;
  discountEffect?: 'KEEPS' | 'ENDS' | 'NONE';
  refusal?: { code: string; message: string } | null;
} = {}) {
  const offered = (planId: string | null) =>
    buildPlans().find(
      (plan) => plan.id === planId && plan.status === 'ACTIVE' && plan.price,
    );
  const current = offered(from);
  const currentPrice = current?.price?.amount.amount ?? 0;
  const subscriptionOn = (overrides: Partial<SubscriptionPayload>) =>
    buildSubscription({
      status: 'ACTIVE',
      incompleteExpiresAt: null,
      ...(current?.price
        ? {
            plan: { id: current.id, slug: current.slug, name: current.name },
            price: current.price.amount,
          }
        : {}),
      ...overrides,
    });

  return [
    http.get(
      apiUrl('/billing/me/subscription/change-plan/preview'),
      ({ request }) => {
        if (isStranger(request)) return unauthorized();
        if (refusal) return conflict(refusal.code, refusal.message);
        const plan = offered(new URL(request.url).searchParams.get('planId'));
        if (!plan?.price) return conflict('ERR_5074', 'Plan unavailable');
        const upgrade = plan.price.amount.amount > currentPrice;
        const receipt = buildProrationInvoice();
        return HttpResponse.json({
          kind: upgrade ? 'UPGRADE' : 'DOWNGRADE',
          lines: upgrade ? receipt.lines : [],
          total: upgrade ? receipt.total : usd(0),
          effectiveAt: upgrade ? null : periodEnd,
          discountEffect,
          courtesyCovered: false,
        });
      },
    ),

    http.post(
      apiUrl('/billing/me/subscription/change-plan'),
      async ({ request }) => {
        if (isStranger(request)) return unauthorized();
        const body = planChangeBodySchema.safeParse(await request.json());
        if (!body.success) return badRequest();
        if (refusal) return conflict(refusal.code, refusal.message);
        if (
          discountEffect === 'ENDS' &&
          body.data.acceptDiscountLoss !== true
        ) {
          return conflict('ERR_5108', 'Discount loss not accepted');
        }
        const plan = offered(body.data.planId);
        if (!plan?.price) return conflict('ERR_5074', 'Plan unavailable');
        const target = { id: plan.id, slug: plan.slug, name: plan.name };
        if (plan.price.amount.amount > currentPrice) {
          return HttpResponse.json({
            kind: 'UPGRADE',
            subscription: subscriptionOn({
              pendingUpgrade: { plan: target, invoiceId: invoiceIds.upgrade },
            }),
            prorationInvoice: buildProrationInvoice(),
            effectiveAt: null,
          });
        }
        return HttpResponse.json({
          kind: 'DOWNGRADE',
          subscription: subscriptionOn({
            scheduledChange: {
              plan: target,
              price: plan.price.amount,
              effectiveAt: periodEnd,
            },
          }),
          prorationInvoice: null,
          effectiveAt: periodEnd,
        });
      },
    ),
  ];
}

/*
 * The specialist's billing (M13): the plans, the subscription and its
 * receipts, the payment attempt with Redoctor's accounts, the report and
 * the coupons, with the API's rules. The default subscription is none; a
 * test that needs one installs `subscriptionHandler` with `server.use`.
 */
export const billingHandlers = [
  http.get(apiUrl('/billing/plans'), ({ request }) =>
    isStranger(request)
      ? unauthorized()
      : HttpResponse.json({ plans: buildPlans() }),
  ),

  subscriptionHandler(null),

  invoicesHandler([]),

  invoiceDetailHandler(buildInvoice()),

  ...planChangeHandlers(),

  ...subscriptionActionHandlers(),

  balanceHandler(0),

  billingAccountHandler(),

  applyDiscountHandler(),

  http.post(apiUrl('/billing/me/coupons'), async ({ request }) => {
    if (isStranger(request)) return unauthorized();
    const body = saveCouponBodySchema.safeParse(await request.json());
    if (!body.success) return badRequest();
    const refusal = couponResponse(body.data.code, undefined);
    if (refusal) return refusal;
    return HttpResponse.json(
      {
        savedCoupon: {
          ...knownCoupons[body.data.code],
          savedCouponId: `saved-${body.data.code}`,
          state: 'AVAILABLE',
          savedAt: new Date().toISOString(),
        },
      },
      { status: 201 },
    );
  }),

  http.delete(
    apiUrl('/billing/me/subscription/scheduled-change'),
    ({ request }) =>
      isStranger(request)
        ? unauthorized()
        : HttpResponse.json({
            subscription: buildSubscription({
              status: 'ACTIVE',
              incompleteExpiresAt: null,
            }),
          }),
  ),

  http.post(apiUrl('/billing/me/subscription'), async ({ request }) => {
    if (isStranger(request)) return unauthorized();
    const body = subscribeBodySchema.safeParse(await request.json());
    if (!body.success) return badRequest();
    const plan = buildPlans().find(
      (candidate) => candidate.id === body.data.planId,
    );
    if (!plan?.price || plan.status !== 'ACTIVE') {
      return conflict('ERR_5074', 'Plan unavailable');
    }
    const price = plan.price.amount;
    let discount = 0;
    let code: string | null = null;
    if (body.data.coupon) {
      code =
        'code' in body.data.coupon
          ? body.data.coupon.code
          : body.data.coupon.savedCouponId === savedCouponId
            ? couponCodes.professionalOnly
            : 'UNKNOWN';
      const refusal = couponResponse(code, plan.id);
      if (refusal) return refusal;
      const terms = couponSchema.parse(knownCoupons[code]);
      discount = couponDiscount(terms, price).amount;
    }
    const pending = price.amount - discount;
    const subscription = buildSubscription({
      plan: { id: plan.id, slug: plan.slug, name: plan.name },
      price,
      status: pending === 0 ? 'ACTIVE' : 'INCOMPLETE',
      incompleteExpiresAt:
        pending === 0 ? null : buildSubscription().incompleteExpiresAt,
      discount:
        code === null
          ? null
          : {
              couponName: knownCoupons[code]?.name ?? code,
              code,
              discountType: knownCoupons[code]?.discountType ?? 'PERCENT',
              percentOff: knownCoupons[code]?.percentOff ?? null,
              amountOff: knownCoupons[code]?.amountOff ?? null,
              duration: knownCoupons[code]?.duration ?? 'ONCE',
              remainingCycles: 0,
              status: 'ACTIVE',
            },
    });
    const invoice = buildInvoice({
      status: pending === 0 ? 'PAID' : 'OPEN',
      total: usd(pending),
      paid: usd(0),
      pending: usd(pending),
      lines: [
        {
          type: 'PLAN',
          description: `Plan ${plan.name} · 12 oct – 11 nov 2026`,
          amount: price,
        },
        ...(discount > 0
          ? [
              {
                type: 'DISCOUNT',
                description: `Cupón ${code ?? ''}`,
                amount: usd(-discount),
              },
            ]
          : []),
      ],
    });
    return HttpResponse.json({ subscription, invoice }, { status: 201 });
  }),

  http.post(
    apiUrl('/billing/me/invoices/:invoiceId/payment-intents'),
    async ({ request, params }) => {
      if (isStranger(request)) return unauthorized();
      const body = startPaymentBodySchema.safeParse(await request.json());
      if (!body.success) return badRequest();
      const invoiceId = String(params.invoiceId);
      if (invoiceId === invoiceIds.noRate) {
        return HttpResponse.json(
          errorEnvelope('ERR_5085', 'No accepted exchange rate'),
          { status: 503 },
        );
      }
      return HttpResponse.json(
        buildStartedPayment(body.data.method, { invoiceId }),
        { status: 201 },
      );
    },
  ),

  http.post(
    apiUrl('/billing/me/payment-intents/:intentId/report'),
    async ({ request, params }) => {
      if (isStranger(request)) return unauthorized();
      const body = paymentReportBodySchema.safeParse(await request.json());
      if (!body.success) return badRequest();
      const intentId = String(params.intentId);
      if (intentId === intentIds.expired) {
        return conflict('ERR_5083', 'Payment intent expired');
      }
      if (intentId === intentIds.inReview) {
        return conflict('ERR_5084', 'Payment already in review');
      }
      return HttpResponse.json({
        intent: buildIntent({
          id: intentId,
          status: 'IN_REVIEW',
          reported: {
            reference: body.data.reference,
            bankCode: body.data.bankCode,
            origin: body.data.origin,
            paidOn: body.data.paidOn,
            amount: { amount: body.data.amountVes, currency: 'VES' },
            reportedAt: new Date().toISOString(),
          },
        }),
      });
    },
  ),

  http.post(apiUrl('/billing/me/coupons/validate'), async ({ request }) => {
    if (isStranger(request)) return unauthorized();
    const body = couponValidationBodySchema.safeParse(await request.json());
    if (!body.success) return badRequest();
    const refusal = couponResponse(body.data.code, body.data.planId);
    if (refusal) return refusal;
    return HttpResponse.json({ coupon: knownCoupons[body.data.code] });
  }),

  http.get(apiUrl('/billing/me/coupons'), ({ request }) =>
    isStranger(request)
      ? unauthorized()
      : HttpResponse.json({ items: buildSavedCoupons() }),
  ),
];

export { planIds };
