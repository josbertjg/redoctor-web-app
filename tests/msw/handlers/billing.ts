import { http, HttpResponse } from 'msw';

import {
  couponDiscount,
  couponSchema,
  couponValidationBodySchema,
  paymentReportBodySchema,
  startPaymentBodySchema,
  subscribeBodySchema,
} from '@/app/lib/schemas/billing';

import {
  buildInvoice,
  buildInvoiceDetail,
  buildIntent,
  buildPlans,
  buildSavedCoupons,
  buildStartedPayment,
  buildSubscription,
  couponCodes,
  intentIds,
  invoiceIds,
  knownCoupons,
  planIds,
  savedCouponId,
  usd,
  type IntentPayload,
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

/** `GET /billing/me/invoices`, the newest first, filtered by status as the API does. */
export function invoicesHandler(items: InvoicePayload[]) {
  return http.get(apiUrl('/billing/me/invoices'), ({ request }) => {
    if (isStranger(request)) return unauthorized();
    const status = new URL(request.url).searchParams.get('status');
    const matching = status
      ? items.filter((invoice) => invoice.status === status)
      : items;
    return HttpResponse.json({
      items: matching,
      meta: { total: matching.length, page: 1, limit: 20, totalPages: 1 },
    });
  });
}

/** `GET /billing/me/invoices/{id}` for one receipt with its attempts, the newest first. */
export function invoiceDetailHandler(
  invoice: InvoicePayload,
  intents: IntentPayload[] = [],
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
        invoice: buildInvoiceDetail(invoice, intents),
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
