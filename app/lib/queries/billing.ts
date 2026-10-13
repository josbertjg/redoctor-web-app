import { queryOptions } from '@tanstack/react-query';

import { apiFetch } from '../api/client';
import {
  couponRejectionByCode,
  type CouponRejectionKey,
  isApiError,
} from '../api/errors';
import { createWriteOnceGuard } from '../api/write-once';
import {
  couponResponseSchema,
  couponValidationBodySchema,
  currentSubscriptionSchema,
  invoiceDetailResponseSchema,
  isPayable,
  mayOwe,
  offeredPlans,
  openInvoicesResponseSchema,
  pickPayableInvoice,
  planChangeBodySchema,
  planChangePreviewSchema,
  planChangeResponseSchema,
  plansResponseSchema,
  reportedPaymentResponseSchema,
  savedCouponsResponseSchema,
  startedPaymentSchema,
  subscribeResponseSchema,
  subscriptionResponseSchema,
  toInvoiceDetail,
  type Coupon,
  type CouponChoice,
  type CurrentSubscription,
  type InvoiceDetail,
  type OfferedPlan,
  type PaymentIntent,
  type PaymentMethod,
  type PaymentReportBody,
  type PlanChangePreview,
  type SavedCoupon,
  type StartedPayment,
  type SubscribeBody,
  type Subscription,
} from '../schemas/billing';

import type { TokenHolder } from '../api/types';

/*
 * The specialist's billing, read and written in the browser with their
 * token (AGENTS.md §4): the subscription and the receipt it owes, the plans
 * on offer, the coupons, and the payment — started with the API's amount
 * in bolívares, then reported. Taking a plan and reporting a payment must
 * never land twice: both go through the write-once guard (§5).
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
};

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
): Promise<InvoiceDetail> {
  const { invoice } = await apiFetch({
    path: '/billing/me/invoices/:invoiceId',
    params: { invoiceId },
    token: await user.getToken(),
    schema: invoiceDetailResponseSchema,
    ...(signal ? { signal } : {}),
  });
  return invoice;
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
    ? null
    : (subscription.pendingUpgrade?.invoiceId ?? null);

  if (owesCycle) {
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

/** The person's saved coupons still to use («Mis cupones»). */
export function savedCouponsQueryOptions(user: TokenHolder) {
  return queryOptions({
    queryKey: billingKeys.savedCoupons(user.id),
    queryFn: async ({ signal }): Promise<SavedCoupon[]> => {
      const { items } = await apiFetch({
        path: '/billing/me/coupons',
        token: await user.getToken(),
        schema: savedCouponsResponseSchema,
        signal,
      });
      return items.filter((coupon) => coupon.state === 'AVAILABLE');
    },
    staleTime: 60_000,
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
  '/billing/me/subscription',
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

/** What taking a plan left: the subscription and, when it must be paid, its receipt. */
export type Subscribed = {
  subscription: Subscription;
  /** Null when a coupon covered the first month: the plan is active already. */
  invoice: InvoiceDetail | null;
};

const subscriptions = createWriteOnceGuard<Subscribed>();

/**
 * `POST /billing/me/subscription`: the subscription is created INCOMPLETE
 * with its first receipt, due at once, and 72 h to report its payment.
 * `free` says a coupon covers the whole month, so an ACTIVE one counts as
 * this write's.
 */
export function subscribe(
  user: TokenHolder,
  {
    plan,
    coupon,
    free,
  }: { plan: OfferedPlan; coupon: CouponChoice | null; free: boolean },
): Promise<Subscribed> {
  // The subscription this write was creating, if the API got to create it:
  // of this plan and unpaid, or active when the coupon covered it whole.
  const lookAgain = async (): Promise<Subscribed | null> => {
    const { subscription } = await readSubscription(user);
    if (subscription?.plan.id !== plan.id) return null;
    if (subscription.status === 'INCOMPLETE') {
      const payable = await resolvePayable(user, subscription);
      return payable ? { subscription, invoice: payable } : null;
    }
    if (free && subscription.status === 'ACTIVE') {
      return { subscription, invoice: null };
    }
    return null;
  };

  const body: SubscribeBody = {
    planId: plan.id,
    ...(coupon ? { coupon } : {}),
  };

  return subscriptions({
    intent: `subscribe:${plan.id}`,
    send: async () => {
      try {
        const { subscription, invoice } = await apiFetch({
          method: 'POST',
          path: '/billing/me/subscription',
          body,
          token: await user.getToken(),
          schema: subscribeResponseSchema,
        });
        return {
          subscription,
          invoice: isPayable(invoice) ? toInvoiceDetail(invoice) : null,
        };
      } catch (error) {
        // One already on the way (ERR_5071): this flow's own if it is this
        // plan, unpaid — a second tab, a lost answer. Any other is the
        // page's to show.
        if (
          isApiError(error) &&
          error.status === 409 &&
          error.code === 'ERR_5071'
        ) {
          const existing = await lookAgain();
          if (existing) return existing;
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
    queryFn: async ({ signal }): Promise<PlanChangePreview> =>
      apiFetch({
        path: '/billing/me/subscription/change-plan/preview',
        query: { planId },
        token: await user.getToken(),
        schema: planChangePreviewSchema,
        signal,
      }),
    // The difference is counted by the day: never an old figure to pay.
    staleTime: 0,
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
};

const planChanges = createWriteOnceGuard<PlanChanged>();

/**
 * `POST /billing/me/subscription/change-plan`: an upgrade issues the
 * receipt of the difference and the plan changes once it is paid; a
 * downgrade is scheduled for the period's end. Sent twice, an upgrade
 * would issue two receipts: a lost answer is looked for before re-sending.
 * `acceptDiscountLoss` once the person was told the coupon ends with the
 * change (ERR_5108 without it).
 */
export function changePlan(
  user: TokenHolder,
  {
    planId,
    acceptDiscountLoss,
  }: { planId: string; acceptDiscountLoss: boolean },
): Promise<PlanChanged> {
  // The change this write was making, if the API got to make it: an
  // upgrade waiting for its receipt, or already paid with the balance; a
  // downgrade scheduled.
  const lookAgain = async (): Promise<PlanChanged | null> => {
    const { subscription } = await readSubscription(user);
    if (subscription === null) return null;
    if (subscription.pendingUpgrade?.plan.id === planId) {
      const invoice = await resolvePayable(user, subscription);
      return { kind: 'UPGRADE', subscription, invoice, effectiveAt: null };
    }
    if (subscription.scheduledChange?.plan.id === planId) {
      return {
        kind: 'DOWNGRADE',
        subscription,
        invoice: null,
        effectiveAt: subscription.scheduledChange.effectiveAt ?? null,
      };
    }
    if (subscription.plan.id === planId) {
      return {
        kind: 'UPGRADE',
        subscription,
        invoice: null,
        effectiveAt: null,
      };
    }
    return null;
  };

  return planChanges({
    intent: `change-plan:${planId}`,
    send: async () => {
      try {
        const { kind, subscription, prorationInvoice, effectiveAt } =
          await apiFetch({
            method: 'POST',
            path: '/billing/me/subscription/change-plan',
            body: planChangeBodySchema.parse({
              planId,
              ...(acceptDiscountLoss ? { acceptDiscountLoss: true } : {}),
            }),
            token: await user.getToken(),
            schema: planChangeResponseSchema,
          });
        return {
          kind,
          subscription,
          invoice:
            prorationInvoice && isPayable(prorationInvoice)
              ? toInvoiceDetail(prorationInvoice)
              : null,
          effectiveAt: effectiveAt ?? null,
        };
      } catch (error) {
        // A conflict may be this same change, made by a lost answer or a
        // second tab — its receipt is the debt the API now sees (ERR_5075).
        // Any other is the page's to explain.
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

const undoes = createWriteOnceGuard<Subscription>();

/**
 * `DELETE /billing/me/subscription/scheduled-change`: a downgrade waiting
 * for the period's end is dropped, and the plan renews as it is. A
 * conflict, or a lost answer, counts as done once nothing is scheduled any
 * more — the person's wish, whoever got there first.
 */
export function undoScheduledChange(user: TokenHolder): Promise<Subscription> {
  const lookAgain = async (): Promise<Subscription | null> => {
    const { subscription } = await readSubscription(user);
    return subscription !== null && subscription.scheduledChange == null
      ? subscription
      : null;
  };

  return undoes({
    intent: `undo-change:${user.id}`,
    send: async () => {
      try {
        const { subscription } = await apiFetch({
          method: 'DELETE',
          path: '/billing/me/subscription/scheduled-change',
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
