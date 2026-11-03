import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';

import { apiFetch } from '../api/client';
import {
  ApiError,
  couponRejectionByCode,
  type CouponRejectionKey,
  isApiError,
} from '../api/errors';
import { createWriteOnceGuard, mayHaveLandedKeyed } from '../api/write-once';
import {
  actionLanded,
  activeDiscount,
  appliedDiscountResponseSchema,
  balancePageSchema,
  billingAccountResponseSchema,
  checkoutBodySchema,
  checkoutQuoteBodySchema,
  checkoutQuoteViewSchema,
  checkoutResponseSchema,
  couponChoiceSchema,
  couponResponseSchema,
  couponValidationBodySchema,
  currentSubscriptionSchema,
  intentInReview,
  invoiceDetailResponseSchema,
  invoiceFilters,
  invoicesPageSchema,
  isPayable,
  mayOwe,
  nextPage,
  offeredPlans,
  openInvoicesResponseSchema,
  pickPayableInvoice,
  planChangeBodySchema,
  planChangePreviewSchema,
  planChangeResponseSchema,
  plansResponseSchema,
  previewQuote,
  reportedPaymentResponseSchema,
  saveCouponBodySchema,
  savedCouponResponseSchema,
  savedCouponsResponseSchema,
  sortSavedCoupons,
  startedPaymentSchema,
  subscriptionResponseSchema,
  toInvoiceDetail,
  toPaymentQuote,
  type BalancePage,
  type BillingAccount,
  type CheckoutBody,
  type Coupon,
  type CouponChoice,
  type CurrentSubscription,
  type InvoiceDetail,
  type InvoiceFilter,
  type InvoicesPage,
  type PaymentIntent,
  type PaymentMethod,
  type PaymentQuote,
  type PaymentReportBody,
  type PlanChangePreview,
  type SavedCoupon,
  type StartedPayment,
  type Subscription,
  type SubscriptionAction,
  type SubscriptionDiscount,
} from '../schemas/billing';

import type { HttpMethod, TokenHolder } from '../api/types';

/*
 * The specialist's billing, read and written in the browser with their
 * token (AGENTS.md §4): the subscription and the receipt it owes, the plans
 * on offer, the coupons, the payment — started with the API's amount in
 * bolívares, then reported —, the receipts, the balance and whom the
 * receipts are issued to. Every write that must not land twice goes
 * through the write-once guard (§5).
 */

export const billingKeys = {
  plans: () => ['billing', 'plans'] as const,
  subscription: (userId: string) =>
    ['billing', 'subscription', userId] as const,
  /** Every receipt owed by the person's subscriptions, to read them all again. */
  payables: (userId: string) => ['billing', 'payable', userId] as const,
  payable: (userId: string, subscriptionId: string) =>
    ['billing', 'payable', userId, subscriptionId] as const,
  savedCoupons: (userId: string) => ['billing', 'coupons', userId] as const,
  planChange: (userId: string, planId: string) =>
    ['billing', 'plan-change', userId, planId] as const,
  /** The quote a payment holds (REDOC-363): never read again by itself. */
  quote: (userId: string, kind: QuoteKind, planId: string, coupon: string) =>
    ['billing', 'quote', userId, kind, planId, coupon] as const,
  /** Every list of receipts and every receipt read, to read them all again. */
  invoices: (userId: string) => ['billing', 'invoices', userId] as const,
  invoiceList: (userId: string, filter: InvoiceFilter | null) =>
    ['billing', 'invoices', userId, 'list', filter ?? 'all'] as const,
  invoice: (userId: string, invoiceId: string) =>
    ['billing', 'invoices', userId, 'detail', invoiceId] as const,
  balance: (userId: string) => ['billing', 'balance', userId] as const,
  account: (userId: string) => ['billing', 'account', userId] as const,
};

/** Receipts and movements a page brings, as the app asks for them. */
const listPageSize = 20;

/** The plans a specialist can take, the cheapest first. */
export function plansQueryOptions(user: TokenHolder) {
  return queryOptions({
    queryKey: billingKeys.plans(),
    queryFn: async ({ signal }) => {
      const { plans } = await apiFetch({
        path: '/billing/plans',
        token: await user.getToken(),
        schema: plansResponseSchema,
        signal,
      });
      return offeredPlans(plans);
    },
    staleTime: 5 * 60_000,
  });
}

async function readSubscription(
  user: TokenHolder,
  signal?: AbortSignal,
): Promise<CurrentSubscription> {
  return apiFetch({
    path: '/billing/me/subscription',
    token: await user.getToken(),
    schema: currentSubscriptionSchema,
    ...(signal ? { signal } : {}),
  });
}

/** The open subscription, or the last one, with the API's access rule. */
export function subscriptionQueryOptions(user: TokenHolder) {
  return queryOptions({
    queryKey: billingKeys.subscription(user.id),
    queryFn: ({ signal }) => readSubscription(user, signal),
    // A payment may be approved meanwhile: short, no polling.
    staleTime: 30_000,
  });
}

async function readInvoice(
  user: TokenHolder,
  invoiceId: string,
  signal?: AbortSignal,
  /** A link's id that leads nowhere is the page's to say, not a report. */
  linked = false,
): Promise<InvoiceDetail> {
  const { invoice } = await apiFetch({
    path: '/billing/me/invoices/:invoiceId',
    params: { invoiceId },
    token: await user.getToken(),
    schema: invoiceDetailResponseSchema,
    ...(signal ? { signal } : {}),
    ...(linked
      ? { expected: (error) => error.status === 404 || error.status === 400 }
      : {}),
  });
  return invoice;
}

/** The person's receipts, the newest first, a page at a time; `filter` keeps one status. */
export function invoicesQueryOptions(
  user: TokenHolder,
  filter: InvoiceFilter | null,
) {
  return infiniteQueryOptions({
    queryKey: billingKeys.invoiceList(user.id, filter),
    queryFn: async ({ pageParam, signal }): Promise<InvoicesPage> =>
      apiFetch({
        path: '/billing/me/invoices',
        query: {
          page: pageParam,
          limit: listPageSize,
          status: filter === null ? undefined : invoiceFilters[filter],
        },
        token: await user.getToken(),
        schema: invoicesPageSchema,
        signal,
      }),
    initialPageParam: 1,
    getNextPageParam: (last) => nextPage(last.meta),
    // A payment may be approved meanwhile: short, no polling.
    staleTime: 30_000,
  });
}

/** One receipt with everything that happened on it, by the id its page carries. */
export function invoiceQueryOptions(user: TokenHolder, invoiceId: string) {
  return queryOptions({
    queryKey: billingKeys.invoice(user.id, invoiceId),
    queryFn: ({ signal }) => readInvoice(user, invoiceId, signal, true),
    staleTime: 30_000,
  });
}

/** The balance and its movements, the newest first, a page at a time. */
export function balanceQueryOptions(user: TokenHolder) {
  return infiniteQueryOptions({
    queryKey: billingKeys.balance(user.id),
    queryFn: async ({ pageParam, signal }): Promise<BalancePage> =>
      apiFetch({
        path: '/billing/me/balance',
        query: { page: pageParam, limit: listPageSize },
        token: await user.getToken(),
        schema: balancePageSchema,
        signal,
      }),
    initialPageParam: 1,
    getNextPageParam: (last) => nextPage(last.meta),
    staleTime: 30_000,
  });
}

/** Whom the receipts are issued to; the API creates it the first time it is read. */
export function billingAccountQueryOptions(user: TokenHolder) {
  return queryOptions({
    queryKey: billingKeys.account(user.id),
    queryFn: async ({ signal }): Promise<BillingAccount> => {
      const { account } = await apiFetch({
        path: '/billing/me/account',
        token: await user.getToken(),
        schema: billingAccountResponseSchema,
        signal,
      });
      return account;
    },
    // Only an admin changes it.
    staleTime: 5 * 60_000,
  });
}

/**
 * The open receipts, as many as the API gives in one page: the oldest of
 * them is the one owed, so a page that leaves some out could pick a newer
 * one (or none). More than a hundred open at once does not happen.
 */
const openInvoicesPageSize = 100;

/**
 * The receipt left to pay, with its attempts: what tells «you have to pay»
 * from «we are verifying it» or «it was rejected». An unpaid or past-due
 * subscription owes the oldest of its open receipts; an upgrade, the one
 * the API names. Null when nothing is owed.
 */
export async function resolvePayable(
  user: TokenHolder,
  subscription: Subscription,
  signal?: AbortSignal,
): Promise<InvoiceDetail | null> {
  if (!mayOwe(subscription)) return null;

  const owesCycle =
    subscription.status === 'INCOMPLETE' || subscription.status === 'PAST_DUE';
  let invoiceId = owesCycle
    ? // The subscription names its oldest open receipt (REDOC-363).
      (subscription.openInvoice?.id ?? null)
    : (subscription.pendingUpgrade?.invoiceId ?? null);

  if (owesCycle && invoiceId === null) {
    const { items } = await apiFetch({
      path: '/billing/me/invoices',
      query: { status: 'OPEN', page: 1, limit: openInvoicesPageSize },
      token: await user.getToken(),
      schema: openInvoicesResponseSchema,
      ...(signal ? { signal } : {}),
    });
    invoiceId = pickPayableInvoice(items, subscription)?.id ?? null;
  }

  return invoiceId === null ? null : readInvoice(user, invoiceId, signal);
}

/** The receipt a subscription owes; nothing is read for one that owes nothing. */
export function payableInvoiceQueryOptions(
  user: TokenHolder,
  subscription: Subscription | null,
) {
  return queryOptions({
    queryKey: billingKeys.payable(user.id, subscription?.id ?? 'none'),
    queryFn: ({ signal }) =>
      subscription === null
        ? Promise.resolve(null)
        : resolvePayable(user, subscription, signal),
    enabled: subscription !== null && mayOwe(subscription),
    staleTime: 30_000,
  });
}

/** «Mis cupones»: the codes saved and the personal ones an admin gave, the ones still to use first. */
export function myCouponsQueryOptions(user: TokenHolder) {
  return queryOptions({
    queryKey: billingKeys.savedCoupons(user.id),
    queryFn: async ({ signal }): Promise<SavedCoupon[]> => {
      const { items } = await apiFetch({
        path: '/billing/me/coupons',
        token: await user.getToken(),
        schema: savedCouponsResponseSchema,
        signal,
      });
      return sortSavedCoupons(items);
    },
    staleTime: 60_000,
  });
}

/** The saved coupons still to use, to pick one without typing it. */
export function savedCouponsQueryOptions(user: TokenHolder) {
  return queryOptions({
    ...myCouponsQueryOptions(user),
    select: (coupons: SavedCoupon[]) =>
      coupons.filter((coupon) => coupon.state === 'AVAILABLE'),
  });
}

/**
 * `POST /billing/me/coupons`: a code kept in «Mis cupones» to use later.
 * Saving spends nothing and reserves no use; the API takes it twice alike.
 */
export async function saveCoupon(
  user: TokenHolder,
  code: string,
): Promise<SavedCoupon> {
  const { savedCoupon } = await apiFetch({
    method: 'POST',
    path: '/billing/me/coupons',
    body: saveCouponBodySchema.parse({ code }),
    token: await user.getToken(),
    schema: savedCouponResponseSchema,
    idempotent: true,
  });
  return savedCoupon;
}

const discounts = createWriteOnceGuard<SubscriptionDiscount>();

/**
 * `POST /billing/me/subscription/discount`: the coupon discounts the plan
 * in force from the next monthly receipt, and it is spent. One at a time:
 * a conflict (ERR_5106) is this one when a lost answer or a second tab
 * landed it, and the page's to explain otherwise.
 */
export function applyCoupon(
  user: TokenHolder,
  { choice, code }: { choice: CouponChoice; code: string },
): Promise<SubscriptionDiscount> {
  const lookAgain = async (): Promise<SubscriptionDiscount | null> => {
    const { subscription } = await readSubscription(user);
    const discount = subscription ? activeDiscount(subscription) : null;
    return discount?.code.toUpperCase() === code ? discount : null;
  };

  return discounts({
    intent: `discount:${code}`,
    send: async () => {
      try {
        const { discount } = await apiFetch({
          method: 'POST',
          path: '/billing/me/subscription/discount',
          body: couponChoiceSchema.parse(choice),
          token: await user.getToken(),
          schema: appliedDiscountResponseSchema,
        });
        return discount;
      } catch (error) {
        if (
          isApiError(error) &&
          error.status === 409 &&
          error.code === 'ERR_5106'
        ) {
          const landed = await lookAgain();
          if (landed) return landed;
        }
        throw error;
      }
    },
    findLanded: lookAgain,
  });
}

/** `POST /billing/me/coupons/validate`: what a code would discount, without spending it. */
export async function validateCoupon(
  user: TokenHolder,
  code: string,
  planId: string,
): Promise<Coupon> {
  const { coupon } = await apiFetch({
    method: 'POST',
    path: '/billing/me/coupons/validate',
    body: couponValidationBodySchema.parse({ code, planId }),
    token: await user.getToken(),
    schema: couponResponseSchema,
    // A read over POST: safe to send twice.
    idempotent: true,
  });
  return coupon;
}

const rejectionByReason: Readonly<Record<string, CouponRejectionKey>> = {
  CODE_NOT_FOUND: 'billing.couponRejection.invalid',
  CODE_INACTIVE: 'billing.couponRejection.invalid',
  NOT_FOR_THIS_ACCOUNT: 'billing.couponRejection.invalid',
  EXPIRED: 'billing.couponRejection.expired',
  COUPON_ARCHIVED: 'billing.couponRejection.expired',
  LIMIT_REACHED: 'billing.couponRejection.usageLimit',
  ACCOUNT_LIMIT_REACHED: 'billing.couponRejection.usageLimit',
  FIRST_SUBSCRIPTION_ONLY: 'billing.couponRejection.firstSubscriptionOnly',
  PLAN_NOT_ELIGIBLE: 'billing.couponRejection.wrongPlan',
};

/** The writes a coupon rides on: a 404 elsewhere (a receipt, an attempt) says nothing of the coupon. */
const couponPaths: ReadonlySet<string> = new Set([
  '/billing/me/coupons/validate',
  '/billing/me/coupons',
  '/billing/me/checkout/quote',
  '/billing/me/subscription/discount',
]);

/**
 * Why a coupon is no good, in the app's words, or null when the failure is
 * not the coupon's (no connection, the server down). The API says it with
 * a code and, sometimes, a reason in `details`, which is more precise and
 * wins when it comes (the app's `CouponRejection`).
 */
export function couponRejectionKey(error: unknown): CouponRejectionKey | null {
  if (!isApiError(error) || error.kind !== 'http') return null;
  if (!couponPaths.has(error.path)) return null;
  if (error.status === 404) return 'billing.couponRejection.invalid';
  const reason = error.details?.reason;
  if (typeof reason === 'string') {
    const byReason = rejectionByReason[reason];
    if (byReason) return byReason;
  }
  return error.code === undefined
    ? null
    : (couponRejectionByCode[error.code] ?? null);
}

/* ---------- Contracting at «Confirmar» (REDOC-363) ---------------------- */

/** Which quote a payment holds: taking a plan, or upgrading to it. */
export type QuoteKind = 'contract' | 'upgrade';

/** A coupon's identity in a cache key: its code, or the saved coupon's id. */
function couponKey(coupon: CouponChoice | null): string {
  if (coupon === null) return 'none';
  return 'code' in coupon
    ? `code:${coupon.code}`
    : `saved:${coupon.savedCouponId}`;
}

/** The quote a payment works with: read once and held, never again by itself. */
const heldQuote = {
  staleTime: Infinity,
  // Forgotten once the payment is left: opening the plan again quotes anew.
  gcTime: 0,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  // apiFetch already retries a read twice.
  retry: false,
} as const;

/**
 * `POST /billing/me/checkout/quote`: what taking the plan costs today, in
 * dollars and in bolívares, with the coupon and the balance, and where to
 * pay. It creates nothing — no subscription, no receipt, no use of the
 * coupon —, so whoever is only looking is tied to nothing.
 */
async function quoteCheckout(
  user: TokenHolder,
  planId: string,
  coupon: CouponChoice | null,
  signal?: AbortSignal,
): Promise<PaymentQuote> {
  const view = await apiFetch({
    method: 'POST',
    path: '/billing/me/checkout/quote',
    body: checkoutQuoteBodySchema.parse({
      planId,
      ...(coupon ? { coupon } : {}),
    }),
    token: await user.getToken(),
    schema: checkoutQuoteViewSchema,
    // A read over POST: safe to send twice.
    idempotent: true,
    ...(signal ? { signal } : {}),
  });
  return toPaymentQuote(view);
}

/** The quote of taking `planId` with `coupon`, held while the person pays. */
export function checkoutQuoteQueryOptions(
  user: TokenHolder,
  planId: string,
  coupon: CouponChoice | null,
) {
  return queryOptions({
    queryKey: billingKeys.quote(user.id, 'contract', planId, couponKey(coupon)),
    queryFn: ({ signal }) => quoteCheckout(user, planId, coupon, signal),
    ...heldQuote,
  });
}

/** What the preview of a change answers, nothing written but a quote for an upgrade. */
async function readPlanChangePreview(
  user: TokenHolder,
  planId: string,
  signal?: AbortSignal,
): Promise<PlanChangePreview> {
  return apiFetch({
    path: '/billing/me/subscription/change-plan/preview',
    query: { planId },
    token: await user.getToken(),
    schema: planChangePreviewSchema,
    ...(signal ? { signal } : {}),
  });
}

/**
 * The quote of an upgrade, from the change's preview, held while the person
 * pays. Without a rate of the day the preview brings none: that is said as
 * the API says it everywhere else (ERR_5085).
 */
export function upgradeQuoteQueryOptions(user: TokenHolder, planId: string) {
  return queryOptions({
    queryKey: billingKeys.quote(user.id, 'upgrade', planId, 'none'),
    queryFn: async ({ signal }): Promise<PaymentQuote> => {
      const quote = previewQuote(
        await readPlanChangePreview(user, planId, signal),
      );
      if (quote === null) {
        throw new ApiError({
          kind: 'http',
          method: 'GET',
          path: '/billing/me/subscription/change-plan/preview',
          status: 503,
          code: 'ERR_5085',
        });
      }
      return quote;
    },
    ...heldQuote,
  });
}

/** What confirming left: the subscription, and the payment in review (none when nothing was to pay). */
export type Confirmed = {
  subscription: Subscription;
  intent: PaymentIntent | null;
};

/**
 * The payment waiting for an admin on the receipt a subscription owes:
 * what the subscription says of it (REDOC-363), or its receipt read.
 */
async function hasPaymentInReview(
  user: TokenHolder,
  subscription: Subscription,
  invoiceId: string | null = null,
): Promise<boolean> {
  const owed = invoiceId ?? subscription.openInvoice?.id ?? null;
  if (owed !== null && owed === subscription.openInvoice?.id) {
    if (subscription.lastPayment) {
      return subscription.lastPayment.status === 'IN_REVIEW';
    }
  }
  const detail =
    owed === null
      ? await resolvePayable(user, subscription)
      : await readInvoice(user, owed);
  return detail !== null && intentInReview(detail) !== null;
}

const checkouts = createWriteOnceGuard<Confirmed>(mayHaveLandedKeyed);

/**
 * `POST /billing/me/checkout`: takes the plan and reports its payment in one
 * transaction — the subscription, its receipt with the quoted lines, the
 * attempt at the quoted rate, the report in review — or, with nothing to
 * pay, the plan active at once. The key (`Idempotency-Key`, which the API
 * requires) is the same while the body is: a second send answers what the
 * first one created. A lost answer, or the same key still being answered,
 * is looked for in the subscription before anything goes again.
 */
export function confirmCheckout(
  user: TokenHolder,
  {
    planId,
    quoteId,
    method,
    payment,
    idempotencyKey,
  }: {
    planId: string;
    quoteId: string;
    method: PaymentMethod | null;
    payment: PaymentReportBody | null;
    idempotencyKey: string;
  },
): Promise<Confirmed> {
  const paying = method !== null && payment !== null;
  // The subscription this confirmation was creating, if it landed: of this
  // plan with its payment in review, or active when nothing was to pay.
  const lookAgain = async (): Promise<Confirmed | null> => {
    const { subscription } = await readSubscription(user);
    if (subscription?.plan.id !== planId) return null;
    if (!paying) {
      return subscription.status === 'ACTIVE'
        ? { subscription, intent: null }
        : null;
    }
    if (subscription.status !== 'INCOMPLETE') return null;
    return (await hasPaymentInReview(user, subscription))
      ? { subscription, intent: null }
      : null;
  };

  const body: CheckoutBody = checkoutBodySchema.parse({
    quoteId,
    ...(paying ? { method, payment } : {}),
  });

  return checkouts({
    intent: `checkout:${planId}`,
    send: async () => {
      try {
        const { subscription, intent } = await apiFetch({
          method: 'POST',
          path: '/billing/me/checkout',
          body,
          token: await user.getToken(),
          schema: checkoutResponseSchema,
          idempotencyKey,
          // The quote is gone (ERR_5124): the payment quotes again.
          expected: (error) => error.code === 'ERR_5124',
        });
        return { subscription, intent };
      } catch (error) {
        // The quote used already (ERR_5126), or a subscription on its way
        // (ERR_5071): this very payment, when an earlier send landed.
        if (
          isApiError(error) &&
          error.status === 409 &&
          (error.code === 'ERR_5126' || error.code === 'ERR_5071')
        ) {
          const landed = await lookAgain();
          if (landed) return landed;
        }
        throw error;
      }
    },
    findLanded: lookAgain,
  });
}

/**
 * `POST /billing/me/invoices/{id}/payment-intents`: fixes the amount in
 * bolívares with the day's rate and answers Redoctor's accounts. Safe to
 * repeat: the API answers the current attempt when there is one.
 */
export async function startPayment(
  user: TokenHolder,
  invoiceId: string,
  method: PaymentMethod,
): Promise<StartedPayment> {
  return apiFetch({
    method: 'POST',
    path: '/billing/me/invoices/:invoiceId/payment-intents',
    params: { invoiceId },
    body: { method },
    token: await user.getToken(),
    schema: startedPaymentSchema,
    idempotent: true,
  });
}

const reports = createWriteOnceGuard<PaymentIntent>();

/**
 * `POST /billing/me/payment-intents/{id}/report`: the payment is born in
 * review and activates nothing until an admin approves it. Reported twice it
 * would be two payments: a lost answer is looked for before re-sending.
 */
export function reportPayment(
  user: TokenHolder,
  intent: Pick<PaymentIntent, 'id' | 'invoiceId'>,
  body: PaymentReportBody,
): Promise<PaymentIntent> {
  // The report that got no answer, if it landed: the same attempt, reported
  // with this reference.
  const lookAgain = async (): Promise<PaymentIntent | null> => {
    const detail = await readInvoice(user, intent.invoiceId);
    return (
      detail.intents.find(
        (candidate) =>
          candidate.id === intent.id &&
          candidate.reported?.reference === body.reference,
      ) ?? null
    );
  };

  return reports({
    intent: `report:${intent.id}`,
    send: async () => {
      try {
        const { intent: reported } = await apiFetch({
          method: 'POST',
          path: '/billing/me/payment-intents/:intentId/report',
          params: { intentId: intent.id },
          body,
          token: await user.getToken(),
          schema: reportedPaymentResponseSchema,
        });
        return reported;
      } catch (error) {
        // Already in review (ERR_5084): ours, when the lost answer landed.
        if (
          isApiError(error) &&
          error.status === 409 &&
          error.code === 'ERR_5084'
        ) {
          const landed = await lookAgain();
          if (landed) return landed;
        }
        throw error;
      }
    },
    findLanded: lookAgain,
  });
}

/**
 * What changing to a plan would do — the receipt of an upgrade, the day a
 * downgrade applies, the coupon's fate —, nothing written. A refusal (a
 * receipt owed, a limit) has the API's own words.
 */
export function planChangePreviewQueryOptions(
  user: TokenHolder,
  planId: string,
) {
  return queryOptions({
    queryKey: billingKeys.planChange(user.id, planId),
    queryFn: ({ signal }): Promise<PlanChangePreview> =>
      readPlanChangePreview(user, planId, signal),
    // The difference is counted by the day: never an old figure to pay.
    staleTime: 0,
    // Each read writes an upgrade's quote on the API's side: not on a focus.
    refetchOnWindowFocus: false,
  });
}

/** What changing plan left: the subscription and, for an upgrade, the receipt of the difference. */
export type PlanChanged = {
  kind: 'UPGRADE' | 'DOWNGRADE' | 'UNKNOWN';
  subscription: Subscription;
  /** An upgrade's receipt while something is left to pay on it. */
  invoice: InvoiceDetail | null;
  /** When the new plan applies, when the API says it (a downgrade: the period's end). */
  effectiveAt: string | null;
  /** A quoted upgrade's payment, reported with the change and in review. */
  intent: PaymentIntent | null;
};

/** A quoted upgrade (REDOC-363): its quote and, when something is to pay, the payment. */
export type QuotedUpgrade = {
  quoteId: string;
  method: PaymentMethod | null;
  payment: PaymentReportBody | null;
};

const planChanges = createWriteOnceGuard<PlanChanged>();

/**
 * `POST /billing/me/subscription/change-plan`. A downgrade is scheduled for
 * the period's end — with `acceptOfficeDeactivation` once the person
 * accepted that the offices it does not fit turn off then. An upgrade
 * issues the receipt of the difference and the plan changes once it is
 * paid: with its quote (`quoted`) the payment is reported in the same call,
 * which is how the web pays one. Sent twice, an upgrade would issue two
 * receipts: a lost answer is looked for before re-sending.
 * `acceptDiscountLoss` once the person was told the coupon ends with the
 * change (ERR_5108 without it).
 */
export function changePlan(
  user: TokenHolder,
  {
    planId,
    acceptDiscountLoss,
    acceptOfficeDeactivation = false,
    quoted = null,
  }: {
    planId: string;
    acceptDiscountLoss: boolean;
    acceptOfficeDeactivation?: boolean;
    quoted?: QuotedUpgrade | null;
  },
): Promise<PlanChanged> {
  const paying = quoted?.method != null && quoted.payment != null;
  // The change this write was making, if the API got to make it: an
  // upgrade waiting for its receipt — with this payment in review when it
  // carried one —, or already paid with the balance; a downgrade scheduled.
  const lookAgain = async (): Promise<PlanChanged | null> => {
    const { subscription } = await readSubscription(user);
    if (subscription === null) return null;
    const upgrade = subscription.pendingUpgrade;
    if (upgrade?.plan.id === planId) {
      if (paying) {
        return (await hasPaymentInReview(user, subscription, upgrade.invoiceId))
          ? {
              kind: 'UPGRADE',
              subscription,
              invoice: null,
              effectiveAt: null,
              intent: null,
            }
          : null;
      }
      const invoice = await resolvePayable(user, subscription);
      return {
        kind: 'UPGRADE',
        subscription,
        invoice,
        effectiveAt: null,
        intent: null,
      };
    }
    if (subscription.scheduledChange?.plan.id === planId) {
      return {
        kind: 'DOWNGRADE',
        subscription,
        invoice: null,
        effectiveAt: subscription.scheduledChange.effectiveAt ?? null,
        intent: null,
      };
    }
    if (subscription.plan.id === planId) {
      return {
        kind: 'UPGRADE',
        subscription,
        invoice: null,
        effectiveAt: null,
        intent: null,
      };
    }
    return null;
  };

  const body = planChangeBodySchema.parse({
    planId,
    ...(acceptDiscountLoss ? { acceptDiscountLoss: true } : {}),
    ...(acceptOfficeDeactivation ? { acceptOfficeDeactivation: true } : {}),
    ...(quoted ? { quoteId: quoted.quoteId } : {}),
    ...(paying ? { method: quoted.method, payment: quoted.payment } : {}),
  });

  return planChanges({
    intent: `change-plan:${planId}`,
    send: async () => {
      try {
        const { kind, subscription, prorationInvoice, effectiveAt, intent } =
          await apiFetch({
            method: 'POST',
            path: '/billing/me/subscription/change-plan',
            body,
            token: await user.getToken(),
            schema: planChangeResponseSchema,
            // The quote is gone (ERR_5124): the payment quotes again.
            expected: (error) => error.code === 'ERR_5124',
          });
        return {
          kind,
          subscription,
          invoice:
            prorationInvoice && isPayable(prorationInvoice) && intent === null
              ? toInvoiceDetail(prorationInvoice)
              : null,
          effectiveAt: effectiveAt ?? null,
          intent,
        };
      } catch (error) {
        // A conflict may be this same change, made by a lost answer or a
        // second tab — its receipt is the debt the API now sees (ERR_5075),
        // its quote is used (ERR_5126). A changed quote (ERR_5125) created
        // nothing, and any other is the page's to explain.
        if (
          isApiError(error) &&
          error.status === 409 &&
          error.code !== 'ERR_5125'
        ) {
          const landed = await lookAgain();
          if (landed) return landed;
        }
        throw error;
      }
    },
    findLanded: lookAgain,
  });
}

/** How each transition is asked of the API. */
const transitionRequests = {
  cancel: { method: 'POST', path: '/billing/me/subscription/cancel' },
  resume: { method: 'POST', path: '/billing/me/subscription/resume' },
  abandon: { method: 'POST', path: '/billing/me/subscription/abandon' },
  undoPlanChange: {
    method: 'DELETE',
    path: '/billing/me/subscription/scheduled-change',
  },
} as const satisfies Record<
  SubscriptionAction,
  { method: HttpMethod; path: string }
>;

const transitions = createWriteOnceGuard<Subscription>();

/**
 * The transitions of «Mi suscripción», as the app runs them: cancelling at
 * the period's end (access is kept until then, the next month is not
 * charged), resuming before that day, abandoning an unpaid subscription
 * (its receipt is voided) and undoing a scheduled downgrade. Each answers
 * the subscription as it stays. A conflict, or a lost answer, counts as
 * done once the subscription stands where the action leaves it — the
 * person's wish, whoever got there first (another tab, the app).
 */
export function changeSubscription(
  user: TokenHolder,
  action: SubscriptionAction,
): Promise<Subscription> {
  const lookAgain = async (): Promise<Subscription | null> => {
    const { subscription } = await readSubscription(user);
    return subscription !== null && actionLanded(action, subscription)
      ? subscription
      : null;
  };
  const request = transitionRequests[action];

  return transitions({
    intent: `${action}:${user.id}`,
    send: async () => {
      try {
        const { subscription } = await apiFetch({
          method: request.method,
          path: request.path,
          // The POSTs take an empty object; the DELETE, no body.
          ...(request.method === 'POST' ? { body: {} } : {}),
          token: await user.getToken(),
          schema: subscriptionResponseSchema,
        });
        return subscription;
      } catch (error) {
        if (isApiError(error) && error.status === 409) {
          const landed = await lookAgain();
          if (landed) return landed;
        }
        throw error;
      }
    },
    findLanded: lookAgain,
  });
}
