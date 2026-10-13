import { z } from 'zod';

import { calendarDaysUntil } from '../format/dates';

/*
 * The specialist's billing (M13): the contract of `/billing/*` as the web
 * reads it, and the rules the app applies to it (lib/features/billing in
 * the app). Amounts are integers in the smallest unit of their currency
 * (cents of a dollar, céntimos of a bolívar): the API never sends decimals,
 * and adding or comparing integers carries no rounding.
 */

export const moneySchema = z.object({
  amount: z.number().int(),
  // Another currency is written with its code, never a broken page.
  currency: z.enum(['USD', 'VES']).or(z.string()),
});

export type Money = z.infer<typeof moneySchema>;

/** Instants come as ISO strings; the API leaves many of them empty. */
const instant = z.string().nullish();

/** A value this version does not know stays inert instead of breaking the page. */
const unknownValue = z.string().transform(() => 'UNKNOWN' as const);

/* ---------- Plans -------------------------------------------------------- */

const planPriceSchema = z.object({
  id: z.string(),
  amount: moneySchema,
  status: z.string(),
});

export const planSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  /** `null` means unlimited, not zero. */
  maxActiveClinics: z.number().int().nullish(),
  canExportReports: z.boolean(),
  status: z.string(),
  /** Missing on a plan the admin has not finished configuring. */
  price: planPriceSchema.nullish(),
});

export type Plan = z.infer<typeof planSchema>;

/** A plan a specialist can take today: active, with a current price. */
export type OfferedPlan = Plan & { price: z.infer<typeof planPriceSchema> };

export const plansResponseSchema = z.object({ plans: z.array(planSchema) });

/** The plans on offer, the cheapest first, as the app lists them. */
export function offeredPlans(plans: readonly Plan[]): OfferedPlan[] {
  return plans
    .filter(
      (plan): plan is OfferedPlan =>
        plan.status === 'ACTIVE' && plan.price?.status === 'ACTIVE',
    )
    .sort((a, b) => a.price.amount.amount - b.price.amount.amount);
}

/**
 * The metal of a plan's crown, from its slug, as the app paints it: the
 * API does not rank plans, so «corporativo» is gold, «profesional» silver
 * and anything else bronze.
 */
export type PlanTier = 'bronze' | 'silver' | 'gold';

const planSlugPattern = /^[a-z0-9][a-z0-9_-]{0,63}$/i;

/** A plan's slug as a link carries it (`?plan=`); anything else is no plan. */
export function parsePlanSlug(value: unknown): string | null {
  return typeof value === 'string' && planSlugPattern.test(value)
    ? value
    : null;
}

export function planTier(slug: string): PlanTier {
  const value = slug.toLowerCase();
  if (value.includes('corporat')) return 'gold';
  if (value.includes('profes')) return 'silver';
  return 'bronze';
}

/* ---------- Subscription ------------------------------------------------- */

export const subscriptionStatuses = [
  'INCOMPLETE',
  'INCOMPLETE_EXPIRED',
  'ACTIVE',
  'PAST_DUE',
  'CANCELED',
] as const;

export type SubscriptionStatus =
  (typeof subscriptionStatuses)[number] | 'UNKNOWN';

const planRefSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
});

export const discountTypes = ['PERCENT', 'AMOUNT'] as const;
export const discountDurations = ['ONCE', 'REPEATING', 'FOREVER'] as const;

const subscriptionDiscountSchema = z.object({
  code: z.string(),
  couponName: z.string().nullish(),
  discountType: z.enum(discountTypes).or(unknownValue),
  percentOff: z.number().nullish(),
  amountOff: moneySchema.nullish(),
  duration: z.enum(discountDurations).or(unknownValue),
  /** Receipts it still discounts; `null` means for ever. */
  remainingCycles: z.number().int().nullish(),
  status: z.string().nullish(),
});

export type SubscriptionDiscount = z.infer<typeof subscriptionDiscountSchema>;

export const subscriptionSchema = z.object({
  id: z.string(),
  status: z.enum(subscriptionStatuses).or(unknownValue),
  plan: planRefSchema,
  /** What the plan costs a month, frozen when it was taken. */
  price: moneySchema,
  currentPeriod: z.object({ start: instant, end: instant }).nullish(),
  cancelAtPeriodEnd: z.boolean().nullish(),
  endsAt: instant,
  scheduledChange: z
    .object({ plan: planRefSchema, price: moneySchema, effectiveAt: instant })
    .nullish(),
  pendingUpgrade: z
    .object({ plan: planRefSchema, invoiceId: z.string() })
    .nullish(),
  /** Until when an INCOMPLETE subscription can be paid (72 h). */
  incompleteExpiresAt: instant,
  /** Until when a PAST_DUE subscription keeps its access. */
  graceEndsAt: instant,
  discount: subscriptionDiscountSchema.nullish(),
  courtesy: z
    .object({ monthsLeft: z.number().int(), endsAt: instant })
    .nullish(),
});

export type Subscription = z.infer<typeof subscriptionSchema>;

/** `GET /billing/me/subscription`: the open subscription, or the last one. */
export const currentSubscriptionSchema = z.object({
  subscription: subscriptionSchema
    .nullish()
    .transform((value) => value ?? null),
  access: z.object({ hasAccess: z.boolean() }),
});

export type CurrentSubscription = z.infer<typeof currentSubscriptionSchema>;

/** It gives no plan any more: it expired unpaid or it ended. For the app, that is having none. */
export function hasEnded(subscription: Subscription): boolean {
  return (
    subscription.status === 'INCOMPLETE_EXPIRED' ||
    subscription.status === 'CANCELED'
  );
}

/** The coupon that really discounts the next receipts. */
export function activeDiscount(
  subscription: Subscription,
): SubscriptionDiscount | null {
  const discount = subscription.discount;
  return discount && discount.status !== 'ENDED' ? discount : null;
}

/** Whether a receipt may be owed: unpaid, past due, or an upgrade waiting for its difference. */
export function mayOwe(subscription: Subscription): boolean {
  if (hasEnded(subscription)) return false;
  return (
    subscription.status === 'INCOMPLETE' ||
    subscription.status === 'PAST_DUE' ||
    subscription.pendingUpgrade != null
  );
}

/* ---------- Invoices and payments ---------------------------------------- */

export const invoiceLineSchema = z.object({
  type: z.string(),
  description: z.string(),
  /** Negative on a discount, or on the unused part of the previous plan. */
  amount: moneySchema,
});

export const invoiceSchema = z.object({
  id: z.string(),
  number: z.string(),
  kind: z.enum(['SUBSCRIPTION_CYCLE', 'PRORATION']).or(unknownValue),
  status: z
    .enum(['DRAFT', 'OPEN', 'PAID', 'VOID', 'UNCOLLECTIBLE'])
    .or(unknownValue),
  subscriptionId: z.string(),
  periodStart: instant,
  periodEnd: instant,
  dueAt: instant,
  total: moneySchema,
  paid: moneySchema,
  credited: moneySchema,
  balanceApplied: moneySchema,
  /** What is left to pay. */
  pending: moneySchema,
  lines: z.array(invoiceLineSchema),
  /** The API asks to show it on every receipt: an internal one, not a fiscal document. */
  notice: z.string().nullish(),
});

export type Invoice = z.infer<typeof invoiceSchema>;

export const paymentMethods = ['MOBILE_PAYMENT', 'BANK_TRANSFER'] as const;
export const paymentMethodSchema = z.enum(paymentMethods);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const paymentIntentSchema = z.object({
  id: z.string(),
  invoiceId: z.string(),
  method: paymentMethodSchema.or(unknownValue),
  amountUsd: moneySchema,
  amountVes: moneySchema,
  /** Bolívares per dollar, a text with 8 decimals: shown, never computed with. */
  rate: z.string(),
  /** `null`: valid while the rate stays current. */
  expiresAt: instant,
  status: z
    .enum([
      'REQUIRES_ACTION',
      'PROCESSING',
      'IN_REVIEW',
      'SUCCEEDED',
      'FAILED',
      'EXPIRED',
      'CANCELED',
    ])
    .or(unknownValue),
  /** What the specialist declared when reporting. */
  reported: z
    .object({
      reference: z.string(),
      bankCode: z.string(),
      origin: z.string(),
      paidOn: z.string(),
      amount: moneySchema,
      reportedAt: instant,
    })
    .nullish(),
  /** Why an admin rejected it, in their own words. */
  failureReason: z.string().nullish(),
  createdAt: instant,
});

export type PaymentIntent = z.infer<typeof paymentIntentSchema>;

/** `GET /billing/me/invoices/{id}`: the receipt with its payment attempts, the newest first. */
export const invoiceDetailResponseSchema = z.object({
  invoice: invoiceSchema.extend({
    intents: z.array(paymentIntentSchema).default([]),
  }),
});

export type InvoiceDetail = z.infer<
  typeof invoiceDetailResponseSchema
>['invoice'];

/** `GET /billing/me/invoices?status=OPEN`: the newest first. */
export const openInvoicesResponseSchema = z.object({
  items: z.array(invoiceSchema),
});

/** Something is still to be paid on it. */
export function isPayable(invoice: Invoice): boolean {
  return invoice.status === 'OPEN' && invoice.pending.amount > 0;
}

/**
 * The receipt to pay among a subscription's open ones: the oldest, as the
 * app does («se paga primero la deuda vieja»); the API lists the newest first.
 */
export function pickPayableInvoice(
  invoices: readonly Invoice[],
  subscription: Subscription,
): Invoice | null {
  const payable = invoices.filter(
    (invoice) =>
      invoice.subscriptionId === subscription.id && isPayable(invoice),
  );
  return payable.at(-1) ?? null;
}

/** A reported payment an admin has not decided yet: while it exists no other can be reported. */
export function intentInReview(detail: InvoiceDetail): PaymentIntent | null {
  return (
    detail.intents.find(
      (intent) =>
        intent.status === 'IN_REVIEW' || intent.status === 'PROCESSING',
    ) ?? null
  );
}

/**
 * The last reported payment, if it was rejected. One started afterwards and
 * not reported does not hide it: the rejection is still the last thing that
 * happened.
 */
export function lastRejected(detail: InvoiceDetail): PaymentIntent | null {
  const lastReported = detail.intents.find((intent) => intent.reported != null);
  return lastReported?.status === 'FAILED' ? lastReported : null;
}

/** The receipt as `POST /billing/me/subscription` answers it: new, with no attempt yet. */
export function toInvoiceDetail(invoice: Invoice): InvoiceDetail {
  return { ...invoice, intents: [] };
}

export const startedPaymentSchema = z.object({
  intent: paymentIntentSchema,
  /** Redoctor's accounts; both come whatever the method chosen. */
  destination: z.object({
    mobilePayment: z.object({
      phone: z.string(),
      bankCode: z.string(),
      bankName: z.string(),
      document: z.string(),
    }),
    bankTransfer: z.object({
      account: z.string(),
      bankCode: z.string(),
      bankName: z.string(),
      holder: z.string(),
      document: z.string(),
      accountType: z.enum(['CORRIENTE', 'AHORRO']).or(unknownValue),
    }),
  }),
});

export type StartedPayment = z.infer<typeof startedPaymentSchema>;

export const reportedPaymentResponseSchema = z.object({
  intent: paymentIntentSchema,
});

/* ---------- Coupons ------------------------------------------------------ */

export const couponSchema = z.object({
  code: z.string(),
  name: z.string(),
  discountType: z.enum(discountTypes).or(unknownValue),
  percentOff: z.number().nullish(),
  amountOff: moneySchema.nullish(),
  duration: z.enum(discountDurations).or(unknownValue),
  /** Only with `REPEATING`. */
  durationMonths: z.number().int().nullish(),
  /** Empty: it applies to every plan. */
  planIds: z.array(z.string()).default([]),
  expiresAt: instant,
  /** An admin gave it to this account: one use, theirs alone. */
  personal: z.boolean().nullish(),
});

export type Coupon = z.infer<typeof couponSchema>;

export const couponResponseSchema = z.object({ coupon: couponSchema });

export const savedCouponSchema = couponSchema.extend({
  savedCouponId: z.string(),
  state: z.enum(['AVAILABLE', 'USED', 'EXPIRED']).or(unknownValue),
});

export type SavedCoupon = z.infer<typeof savedCouponSchema>;

export const savedCouponsResponseSchema = z.object({
  items: z.array(savedCouponSchema),
});

export function couponAppliesTo(coupon: Coupon, planId: string): boolean {
  return coupon.planIds.length === 0 || coupon.planIds.includes(planId);
}

/** What a coupon takes off a price, never more than the price itself. */
export function couponDiscount(
  coupon: Pick<Coupon, 'discountType' | 'percentOff' | 'amountOff'>,
  price: Money,
): Money {
  const raw =
    coupon.discountType === 'PERCENT'
      ? Math.round((price.amount * (coupon.percentOff ?? 0)) / 100)
      : coupon.amountOff?.currency === price.currency
        ? coupon.amountOff.amount
        : 0;
  return {
    amount: Math.min(Math.max(raw, 0), price.amount),
    currency: price.currency,
  };
}

/** It leaves the first receipt at zero: the plan activates without paying. */
export function coversFully(coupon: Coupon, price: Money): boolean {
  return couponDiscount(coupon, price).amount >= price.amount;
}

/* ---------- Bodies -------------------------------------------------------- */

export const couponCodeMinLength = 3;
export const couponCodeMaxLength = 32;

const couponCode = z
  .string()
  .trim()
  .toUpperCase()
  .min(couponCodeMinLength)
  .max(couponCodeMaxLength);

/** A coupon to use: a code the person typed, or one of «Mis cupones». */
export const couponChoiceSchema = z.union([
  z.strictObject({ code: couponCode }),
  z.strictObject({ savedCouponId: z.string() }),
]);

export type CouponChoice = z.infer<typeof couponChoiceSchema>;

export const subscribeBodySchema = z.strictObject({
  planId: z.string(),
  coupon: couponChoiceSchema.optional(),
});

export type SubscribeBody = z.infer<typeof subscribeBodySchema>;

export const subscribeResponseSchema = z.object({
  subscription: subscriptionSchema,
  invoice: invoiceSchema,
});

export const startPaymentBodySchema = z.strictObject({
  method: paymentMethodSchema,
});

export const couponValidationBodySchema = z.strictObject({
  code: couponCode,
  planId: z.string().optional(),
});

/**
 * A reference number of 6 to 22 digits: what a Venezuelan bank receipt
 * gives, inside what the API accepts (3 to 40 characters). The origin — the
 * phone or the account the payment came from — takes the API's bounds.
 */
export const referenceMinLength = 6;
export const referenceMaxLength = 22;
export const originMinLength = 4;
export const originMaxLength = 30;

export const paymentReportBodySchema = z.strictObject({
  reference: z.string().trim().min(3).max(40),
  bankCode: z.string().regex(/^\d{4}$/),
  origin: z.string().trim().min(originMinLength).max(originMaxLength),
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** Céntimos of bolívar, what the person says they paid. */
  amountVes: z.number().int().positive(),
});

export type PaymentReportBody = z.infer<typeof paymentReportBodySchema>;

/* ---------- Changing plan ------------------------------------------------- */

export const planChangeKinds = ['UPGRADE', 'DOWNGRADE'] as const;

/**
 * `GET /billing/me/subscription/change-plan/preview`: what a change would
 * do, nothing written. An upgrade is paid now — a proration receipt: the
 * new plan for the days left, less what the current one leaves unused —
 * and applies once paid; a downgrade costs nothing now and applies at the
 * period's end.
 */
export const planChangePreviewSchema = z.object({
  kind: z.enum(planChangeKinds).or(unknownValue),
  lines: z.array(invoiceLineSchema),
  total: moneySchema,
  effectiveAt: instant,
  /** The coupon in use: kept, lost with the change (it must be accepted), or none. */
  discountEffect: z.enum(['KEEPS', 'ENDS', 'NONE']).or(unknownValue),
  /** A courtesy pays the current period. */
  courtesyCovered: z.boolean(),
});

export type PlanChangePreview = z.infer<typeof planChangePreviewSchema>;

export const planChangeBodySchema = z.strictObject({
  planId: z.string(),
  acceptDiscountLoss: z.literal(true).optional(),
});

/** `DELETE /billing/me/subscription/scheduled-change`: the subscription, renewing as it is. */
export const subscriptionResponseSchema = z.object({
  subscription: subscriptionSchema,
});

/** `POST /billing/me/subscription/change-plan`: the subscription as it stays, and an upgrade's receipt. */
export const planChangeResponseSchema = z.object({
  kind: z.enum(planChangeKinds).or(unknownValue),
  subscription: subscriptionSchema,
  prorationInvoice: invoiceSchema.nullish().transform((value) => value ?? null),
  effectiveAt: instant,
});

/**
 * Whether the plan can be changed now, the app's rule: an active plan, not
 * cancelled, with no upgrade waiting for its difference.
 */
export function canChangePlan(subscription: Subscription): boolean {
  return (
    subscription.status === 'ACTIVE' &&
    subscription.cancelAtPeriodEnd !== true &&
    subscription.pendingUpgrade == null
  );
}

/* ---------- A feature the plan lacks ------------------------------------- */

/**
 * What to offer a specialist for a feature their plan lacks — the owner's
 * rule (2026-10-13): the web may sell, so a missing feature invites to a
 * plan that has it; the app may not.
 */
export type FeatureOffer =
  /** Change to this one: the cheapest on offer with the feature that costs more than the current plan. */
  | { kind: 'upgrade'; plan: OfferedPlan }
  /** No plan, or it ended: take this one, the cheapest with the feature. */
  | { kind: 'subscribe'; plan: OfferedPlan }
  /**
   * A receipt is owed first: the API changes no plan with debt (ERR_5075).
   * Paying it is enough when it is the plan (`plan`) or the upgrade
   * (`upgrade`) that has the feature; otherwise it comes before (`debt`).
   */
  | { kind: 'pay'; owed: 'plan' | 'upgrade' | 'debt'; planName: string }
  /** Cancelled, still running until it ends: nothing to change meanwhile. */
  | { kind: 'ending'; endsAt: string | null }
  /** No plan on offer has it, or the plan cannot change now. */
  | { kind: 'unavailable' };

/** `plans` as `offeredPlans` gives them, the cheapest first. */
export function featureOffer(
  has: (plan: Plan) => boolean,
  plans: readonly OfferedPlan[],
  subscription: Subscription | null,
): FeatureOffer {
  const offered = (id: string) => plans.find((plan) => plan.id === id);

  if (subscription === null || hasEnded(subscription)) {
    const plan = plans.find(has);
    return plan ? { kind: 'subscribe', plan } : { kind: 'unavailable' };
  }
  if (mayOwe(subscription)) {
    const upgrade = subscription.pendingUpgrade;
    if (upgrade != null && subscription.status === 'ACTIVE') {
      const target = offered(upgrade.plan.id);
      return {
        kind: 'pay',
        owed: target && has(target) ? 'upgrade' : 'debt',
        planName: upgrade.plan.name,
      };
    }
    const own = offered(subscription.plan.id);
    return {
      kind: 'pay',
      owed:
        subscription.status === 'INCOMPLETE' && own && has(own)
          ? 'plan'
          : 'debt',
      planName: subscription.plan.name,
    };
  }
  if (subscription.status === 'ACTIVE' && subscription.cancelAtPeriodEnd) {
    return {
      kind: 'ending',
      endsAt: subscription.endsAt ?? subscription.currentPeriod?.end ?? null,
    };
  }
  if (!canChangePlan(subscription)) return { kind: 'unavailable' };

  const plan = plans.find(
    (candidate) =>
      has(candidate) &&
      candidate.id !== subscription.plan.id &&
      candidate.price.amount.currency === subscription.price.currency &&
      candidate.price.amount.amount > subscription.price.amount,
  );
  return plan ? { kind: 'upgrade', plan } : { kind: 'unavailable' };
}

/* ---------- The notice ---------------------------------------------------- */

/**
 * What to tell the specialist about their billing, by gravity, as the app
 * resolves it in one place (`SubscriptionNotice.of`). No notice before a
 * receipt is due, on purpose: they are spoken to when something changed or
 * when a payment is missing.
 */
export type SubscriptionNoticeKind =
  /** A payment was reported and Redoctor has not verified it: nothing to do. */
  | 'inReview'
  /** The renewal was not paid: still visible until the plan is cancelled. */
  | 'pastDue'
  /** The last payment was rejected and there is still time. */
  | 'rejected'
  /** A plan was taken and not paid: it expires if not paid in time. */
  | 'unpaid'
  /** An upgrade waits for its difference to be paid. */
  | 'upgradePending';

export type SubscriptionNotice = {
  kind: SubscriptionNoticeKind;
  /** Calendar days until `deadline`, never negative. */
  days: number;
  /** The deadline of this stage: expiring unpaid, or being cancelled. */
  deadline: string | null;
  /** The admin's reason for the last rejection, when there is one to read. */
  rejectionReason: string | null;
  /** The plan being upgraded to. */
  planName: string | null;
};

/** The payment is the person's to make: what tells a notice from a wait. */
export function noticeNeedsAction(notice: SubscriptionNotice): boolean {
  return notice.kind !== 'inReview';
}

/**
 * `payable` is the receipt left to pay, with its attempts; without it (it
 * could not be read) the notice comes from the subscription alone and only
 * the nuance of the last attempt is lost.
 */
export function subscriptionNotice({
  subscription,
  payable,
  now = new Date(),
}: {
  subscription: Subscription | null;
  payable: InvoiceDetail | null;
  now?: Date;
}): SubscriptionNotice | null {
  if (subscription === null || hasEnded(subscription)) return null;

  const deadline =
    subscription.status === 'INCOMPLETE'
      ? (subscription.incompleteExpiresAt ?? null)
      : subscription.status === 'PAST_DUE'
        ? (subscription.graceEndsAt ?? null)
        : null;
  const days = deadline === null ? 0 : calendarDaysUntil(deadline, now);
  const base = { days, deadline, rejectionReason: null, planName: null };

  if (payable && intentInReview(payable)) return { ...base, kind: 'inReview' };

  const reason = payable
    ? (lastRejected(payable)?.failureReason?.trim() ?? '')
    : '';
  const rejectionReason = reason === '' ? null : reason;

  if (subscription.status === 'PAST_DUE') {
    return { ...base, kind: 'pastDue', rejectionReason };
  }

  const upgrade = subscription.pendingUpgrade;
  const owesUpgrade = upgrade != null && payable?.id === upgrade.invoiceId;
  const isIncomplete = subscription.status === 'INCOMPLETE';

  if (rejectionReason !== null && (isIncomplete || owesUpgrade)) {
    return { ...base, kind: 'rejected', rejectionReason };
  }
  if (isIncomplete) return { ...base, kind: 'unpaid' };
  if (upgrade != null) {
    return {
      ...base,
      kind: 'upgradePending',
      days: 0,
      planName: upgrade.plan.name,
    };
  }
  return null;
}

/* ---------- Chips --------------------------------------------------------- */

export type ChipTone = 'positive' | 'warning' | 'error' | 'neutral';

/** The i18n leaf under `billing.billingStatus` that names a status. */
export type SubscriptionStatusLabel =
  | 'active'
  | 'incomplete'
  | 'pastDue'
  | 'incompleteExpired'
  | 'canceled'
  | 'unknown';

/** The subscription's chip, the app's tones: the same tone means the same everywhere. */
export const subscriptionStatusChips: Record<
  SubscriptionStatus,
  { label: SubscriptionStatusLabel; tone: ChipTone }
> = {
  ACTIVE: { label: 'active', tone: 'positive' },
  INCOMPLETE: { label: 'incomplete', tone: 'warning' },
  PAST_DUE: { label: 'pastDue', tone: 'error' },
  INCOMPLETE_EXPIRED: { label: 'incompleteExpired', tone: 'neutral' },
  CANCELED: { label: 'canceled', tone: 'neutral' },
  UNKNOWN: { label: 'unknown', tone: 'neutral' },
};
