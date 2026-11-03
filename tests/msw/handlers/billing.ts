import { http, HttpResponse } from 'msw';

import {
  checkoutBodySchema,
  checkoutQuoteBodySchema,
  couponChoiceSchema,
  couponDiscount,
  couponSchema,
  couponValidationBodySchema,
  paymentReportBodySchema,
  planChangeBodySchema,
  saveCouponBodySchema,
  startPaymentBodySchema,
  type CouponChoice,
  type PaymentReportBody,
} from '@/app/lib/schemas/billing';

import {
  buildBillingAccount,
  buildCheckoutQuote,
  buildInvoice,
  buildInvoiceDetail,
  buildIntent,
  buildPlans,
  buildProrationInvoice,
  buildSavedCoupons,
  buildStartedPayment,
  buildSubscription,
  buildSupportContact,
  couponCodes,
  destination,
  hoursFromNow,
  intentIds,
  invoiceIds,
  knownCoupons,
  parseQuoteId,
  periodEnd,
  planIds,
  rate,
  savedCouponId,
  toVes,
  usd,
  ves,
  type CheckoutQuotePayload,
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
  officesToDeactivate = [],
  noRate = false,
}: {
  from?: string;
  discountEffect?: 'KEEPS' | 'ENDS' | 'NONE';
  refusal?: { code: string; message: string } | null;
  /** A downgrade's offices that would turn off: it refuses without accepting it (ERR_5076). */
  officesToDeactivate?: { id: string; name: string }[];
  /** No rate of the day: an upgrade's preview brings no quote. */
  noRate?: boolean;
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
        const quoted = upgrade && !noRate;
        return HttpResponse.json({
          kind: upgrade ? 'UPGRADE' : 'DOWNGRADE',
          lines: upgrade ? receipt.lines : [],
          total: upgrade ? receipt.total : usd(0),
          effectiveAt: upgrade ? null : periodEnd,
          discountEffect,
          courtesyCovered: false,
          officesToDeactivate: upgrade ? [] : officesToDeactivate,
          quote: quoted
            ? {
                id: `upgrade-quote:${plan.id}`,
                rate,
                rateDate: '2026-11-02',
                expiresAt: hoursFromNow(72),
              }
            : null,
          balanceApplied: usd(0),
          payableUsd: upgrade ? receipt.total : usd(0),
          totalVes: quoted ? ves(toVes(receipt.total.amount)) : null,
          requiresPayment: upgrade,
          destination: quoted ? destination : null,
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
          const { quoteId, method, payment } = body.data;
          if (quoteId !== undefined && (!method || !payment)) {
            return HttpResponse.json(
              errorEnvelope('ERR_5127', 'Payment required'),
              { status: 400 },
            );
          }
          const paid = quoteId !== undefined && payment !== undefined;
          return HttpResponse.json({
            kind: 'UPGRADE',
            subscription: subscriptionOn({
              pendingUpgrade: { plan: target, invoiceId: invoiceIds.upgrade },
              ...(paid
                ? {
                    openInvoice: {
                      id: invoiceIds.upgrade,
                      number: 'R-2026-000124',
                      kind: 'PRORATION',
                      total: usd(1355),
                      pending: usd(1355),
                      dueAt: hoursFromNow(0),
                    },
                    lastPayment: {
                      intentId: intentIds.fresh,
                      status: 'IN_REVIEW',
                      reason: null,
                    },
                  }
                : {}),
            }),
            prorationInvoice: buildProrationInvoice(),
            effectiveAt: null,
            intent:
              paid && method
                ? buildIntent({
                    invoiceId: invoiceIds.upgrade,
                    method,
                    status: 'IN_REVIEW',
                    reported: {
                      reference: payment.reference,
                      bankCode: payment.bankCode,
                      origin: payment.origin,
                      paidOn: payment.paidOn,
                      amount: ves(payment.amountVes),
                      reportedAt: new Date().toISOString(),
                    },
                  })
                : null,
          });
        }
        if (
          officesToDeactivate.length > 0 &&
          body.data.acceptOfficeDeactivation !== true
        ) {
          return HttpResponse.json(
            {
              ...errorEnvelope('ERR_5076', 'Plan limit exceeded'),
              details: { limit: 'maxActiveClinics' },
            },
            { status: 409 },
          );
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

/** A coupon's code, from what travels with a quote: typed, or one of «Mis cupones». */
function couponCodeOf(choice: CouponChoice | undefined): string | null {
  if (!choice) return null;
  if ('code' in choice) return choice.code;
  return choice.savedCouponId === savedCouponId
    ? couponCodes.professionalOnly
    : 'UNKNOWN';
}

/** The quote the API would make for a plan and a coupon code, or its refusal. */
function quoteFor(planId: string, code: string | null, balance: number) {
  const plan = buildPlans().find(
    (candidate) => candidate.id === planId && candidate.status === 'ACTIVE',
  );
  if (!plan?.price)
    return { refusal: conflict('ERR_5074', 'Plan unavailable') };
  const price = plan.price.amount;
  let discount = 0;
  if (code !== null) {
    const refusal = couponResponse(code, plan.id);
    if (refusal) return { refusal };
    discount = couponDiscount(
      couponSchema.parse(knownCoupons[code]),
      price,
    ).amount;
  }
  return {
    quote: buildCheckoutQuote({
      plan: {
        id: plan.id,
        slug: plan.slug,
        name: plan.name,
        price: price.amount,
      },
      coupon: code,
      discount,
      balance,
    }),
  };
}

/**
 * `POST /billing/me/checkout/quote` and `POST /billing/me/checkout`
 * (REDOC-363), as the API answers them for a specialist with no plan:
 * quoting creates nothing; confirming wants its `Idempotency-Key` (400
 * ERR_1009 without), the payment when something is to pay (400 ERR_5127),
 * and leaves the subscription unpaid with the payment in review — or active,
 * when nothing was to pay. `balance` is the balance the quote applies.
 */
export function checkoutHandlers({ balance = 0 }: { balance?: number } = {}) {
  return [
    http.post(apiUrl('/billing/me/checkout/quote'), async ({ request }) => {
      if (isStranger(request)) return unauthorized();
      const body = checkoutQuoteBodySchema.safeParse(await request.json());
      if (!body.success) return badRequest();
      const result = quoteFor(
        body.data.planId,
        couponCodeOf(body.data.coupon),
        balance,
      );
      return result.refusal ?? HttpResponse.json(result.quote);
    }),

    http.post(apiUrl('/billing/me/checkout'), async ({ request }) => {
      if (isStranger(request)) return unauthorized();
      if (!request.headers.get('idempotency-key')) {
        return HttpResponse.json(
          errorEnvelope('ERR_1009', 'Idempotency-Key required'),
          { status: 400 },
        );
      }
      const body = checkoutBodySchema.safeParse(await request.json());
      if (!body.success) return badRequest();
      const quoted = parseQuoteId(body.data.quoteId);
      if (!quoted) {
        return HttpResponse.json(errorEnvelope('ERR_5124', 'Quote not found'), {
          status: 404,
        });
      }
      const result = quoteFor(quoted.planId, quoted.coupon, balance);
      if (result.refusal) return result.refusal;
      return HttpResponse.json(
        checkoutAnswer(result.quote, body.data.method, body.data.payment),
        {
          status:
            body.data.payment || !result.quote.requiresPayment ? 201 : 400,
        },
      );
    }),
  ];
}

/** What confirming a quote leaves: the subscription, its receipt and the payment in review. */
export function checkoutAnswer(
  quote: CheckoutQuotePayload,
  method: 'MOBILE_PAYMENT' | 'BANK_TRANSFER' | undefined,
  payment: PaymentReportBody | undefined,
) {
  if (quote.requiresPayment && (!method || !payment)) {
    return errorEnvelope('ERR_5127', 'Payment required');
  }
  const paying = quote.requiresPayment && method && payment;
  const invoice = buildInvoice({
    status: paying ? 'OPEN' : 'PAID',
    total: quote.totalUsd,
    balanceApplied: quote.balanceApplied,
    pending: paying ? quote.payableUsd : usd(0),
    lines: quote.lines.map((line) => ({ ...line })),
  });
  return {
    subscription: buildSubscription({
      plan: quote.plan,
      price: quote.lines[0]?.amount ?? usd(0),
      status: paying ? 'INCOMPLETE' : 'ACTIVE',
      incompleteExpiresAt: paying ? hoursFromNow(72) : null,
      openInvoice: paying
        ? {
            id: invoice.id,
            number: invoice.number,
            kind: 'SUBSCRIPTION_CYCLE',
            total: invoice.total,
            pending: invoice.pending,
            dueAt: invoice.dueAt,
          }
        : null,
      lastPayment: paying
        ? { intentId: intentIds.fresh, status: 'IN_REVIEW', reason: null }
        : null,
    }),
    invoice,
    intent: paying
      ? buildIntent({
          method,
          amountUsd: quote.payableUsd,
          amountVes: quote.totalVes,
          rate: quote.quote.rate,
          expiresAt: null,
          status: 'IN_REVIEW',
          reported: {
            reference: payment.reference,
            bankCode: payment.bankCode,
            origin: payment.origin,
            paidOn: payment.paidOn,
            amount: ves(payment.amountVes),
            reportedAt: new Date().toISOString(),
          },
        })
      : null,
  };
}

/** `GET /config/support` (public): the support lines an admin filled. */
export function supportHandler(contact = buildSupportContact()) {
  return http.get(apiUrl('/config/support'), () => HttpResponse.json(contact));
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

  ...checkoutHandlers(),

  supportHandler(),

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
