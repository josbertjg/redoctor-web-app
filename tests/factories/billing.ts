import type {
  couponSchema,
  invoiceDetailResponseSchema,
  invoiceSchema,
  paymentIntentSchema,
  paymentMethodSchema,
  planSchema,
  savedCouponSchema,
  startedPaymentSchema,
  subscriptionSchema,
} from '@/app/lib/schemas/billing';

import type { z } from 'zod';

/* As the API sends them: the contract's fields, plus the ones the web drops. */
export type PlanPayload = z.input<typeof planSchema> & Record<string, unknown>;
export type SubscriptionPayload = z.input<typeof subscriptionSchema> &
  Record<string, unknown>;
export type InvoicePayload = z.input<typeof invoiceSchema> &
  Record<string, unknown>;
export type IntentPayload = z.input<typeof paymentIntentSchema> &
  Record<string, unknown>;
export type InvoiceDetailPayload = z.input<
  typeof invoiceDetailResponseSchema
>['invoice'] &
  Record<string, unknown>;
export type StartedPaymentPayload = z.input<typeof startedPaymentSchema>;
export type CouponPayload = z.input<typeof couponSchema> &
  Record<string, unknown>;
export type SavedCouponPayload = z.input<typeof savedCouponSchema>;
type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const planIds = {
  essential: '0a0a0a0a-0a0a-4a0a-8a0a-0a0a0a0a0a0a',
  professional: '0b0b0b0b-0b0b-4b0b-8b0b-0b0b0b0b0b0b',
  corporate: '0c0c0c0c-0c0c-4c0c-8c0c-0c0c0c0c0c0c',
  /** No longer offered: the API refuses it (ERR_5074). */
  archived: '0d0d0d0d-0d0d-4d0d-8d0d-0d0d0d0d0d0d',
} as const;

export const subscriptionIds = {
  current: '1a1a1a1a-1a1a-4a1a-8a1a-1a1a1a1a1a1a',
} as const;

export const invoiceIds = {
  /** The first receipt of an unpaid subscription. */
  unpaid: '2a2a2a2a-2a2a-4a2a-8a2a-2a2a2a2a2a2a',
  /** The difference of an upgrade. */
  upgrade: '2b2b2b2b-2b2b-4b2b-8b2b-2b2b2b2b2b2b',
  /** Starting its payment finds no rate of the day (ERR_5085). */
  noRate: '2c2c2c2c-2c2c-4c2c-8c2c-2c2c2c2c2c2c',
} as const;

export const intentIds = {
  fresh: '3a3a3a3a-3a3a-4a3a-8a3a-3a3a3a3a3a3a',
  /** Its amount in bolívares expired: reporting it answers ERR_5083. */
  expired: '3b3b3b3b-3b3b-4b3b-8b3b-3b3b3b3b3b3b',
  /** Already reported, by someone else: ERR_5084. */
  inReview: '3c3c3c3c-3c3c-4c3c-8c3c-3c3c3c3c3c3c',
  rejected: '3d3d3d3d-3d3d-4d3d-8d3d-3d3d3d3d3d3d',
} as const;

export const couponCodes = {
  /** 20 % off the first month, every plan. */
  twentyOff: 'REDOCTOR20',
  /** The whole first month: the plan activates without paying. */
  free: 'GRATIS100',
  /** Only for the professional plan (PLAN_NOT_ELIGIBLE elsewhere). */
  professionalOnly: 'SOLOPRO',
  expired: 'VENCIDO',
} as const;

export const savedCouponId = '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a';

export const usd = (amount: number) => ({ amount, currency: 'USD' as const });
export const ves = (amount: number) => ({ amount, currency: 'VES' as const });

/** An instant some hours from now, as the API writes it. */
export const hoursFromNow = (hours: number) =>
  new Date(Date.now() + hours * 3_600_000).toISOString();

export const periodStart = '2026-10-12T04:00:00.000Z';
export const periodEnd = '2026-11-12T03:59:59.999Z';

export function buildPlans(): PlanPayload[] {
  return [
    {
      id: planIds.professional,
      slug: 'profesional',
      name: 'Profesional',
      description: 'Para consultas en varias sedes.',
      maxActiveClinics: 3,
      canExportReports: true,
      status: 'ACTIVE',
      price: {
        id: 'price-professional',
        amount: usd(3000),
        status: 'ACTIVE',
      },
    },
    {
      id: planIds.essential,
      slug: 'esencial',
      name: 'Esencial',
      description: 'Para empezar con un consultorio.',
      maxActiveClinics: 1,
      canExportReports: false,
      status: 'ACTIVE',
      price: {
        id: 'price-essential',
        amount: usd(1500),
        status: 'ACTIVE',
      },
    },
    {
      id: planIds.corporate,
      slug: 'corporativo',
      name: 'Corporativo',
      description: null,
      maxActiveClinics: null,
      canExportReports: true,
      status: 'ACTIVE',
      price: {
        id: 'price-corporate',
        amount: usd(6000),
        status: 'ACTIVE',
      },
    },
    {
      id: planIds.archived,
      slug: 'antiguo',
      name: 'Antiguo',
      description: null,
      maxActiveClinics: 2,
      canExportReports: false,
      status: 'ARCHIVED',
      price: null,
    },
  ];
}

/** An unpaid subscription to the professional plan, 60 h left to pay it. */
export function buildSubscription(
  overrides: Partial<SubscriptionPayload> = {},
): SubscriptionPayload {
  return {
    id: subscriptionIds.current,
    status: 'INCOMPLETE',
    plan: {
      id: planIds.professional,
      slug: 'profesional',
      name: 'Profesional',
    },
    price: usd(3000),
    currentPeriod: { start: periodStart, end: periodEnd },
    cancelAtPeriodEnd: false,
    endsAt: null,
    scheduledChange: null,
    pendingUpgrade: null,
    incompleteExpiresAt: hoursFromNow(60),
    graceEndsAt: null,
    discount: null,
    courtesy: null,
    createdAt: '2026-10-12T12:00:00.000Z',
    ...overrides,
  };
}

/** The first receipt of that subscription: $ 30, nothing paid. */
export function buildInvoice(
  overrides: Partial<InvoicePayload> = {},
): InvoicePayload {
  return {
    id: invoiceIds.unpaid,
    number: 'R-2026-000123',
    kind: 'SUBSCRIPTION_CYCLE',
    status: 'OPEN',
    subscriptionId: subscriptionIds.current,
    periodStart,
    periodEnd,
    dueAt: '2026-10-12T12:00:00.000Z',
    total: usd(3000),
    paid: usd(0),
    credited: usd(0),
    balanceApplied: usd(0),
    pending: usd(3000),
    lines: [
      {
        type: 'PLAN',
        description: 'Plan Profesional · 12 oct – 11 nov 2026',
        amount: usd(3000),
      },
    ],
    billingData: {
      legalName: 'Luis Gómez',
      documentType: 'V',
      documentNumber: '12345678',
    },
    notice: 'Recibo interno. No es un documento fiscal.',
    paidAt: null,
    voidedAt: null,
    createdAt: '2026-10-12T12:00:00.000Z',
    ...overrides,
  };
}

/** An attempt to pay that receipt: $ 30 are Bs 1.198,39 at the day's rate. */
export function buildIntent(
  overrides: Partial<IntentPayload> = {},
): IntentPayload {
  return {
    id: intentIds.fresh,
    invoiceId: invoiceIds.unpaid,
    method: 'MOBILE_PAYMENT',
    amountUsd: usd(3000),
    amountVes: ves(119839),
    rate: '39.94633333',
    expiresAt: hoursFromNow(2),
    status: 'REQUIRES_ACTION',
    reported: null,
    failureReason: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/** What the specialist declared, as the API echoes it. */
export function buildReported(amountVes = 119839) {
  return {
    reference: '00123456',
    bankCode: '0134',
    origin: '+584141234567',
    paidOn: '2026-10-12',
    amount: ves(amountVes),
    reportedAt: new Date().toISOString(),
  };
}

export function buildInvoiceDetail(
  invoice: InvoicePayload = buildInvoice(),
  intents: IntentPayload[] = [],
): InvoiceDetailPayload {
  return { ...invoice, intents, allocations: [], adjustments: [] };
}

export const destination: StartedPaymentPayload['destination'] = {
  mobilePayment: {
    phone: '04141234567',
    bankCode: '0102',
    bankName: 'Banco de Venezuela',
    document: 'J-123456789',
  },
  bankTransfer: {
    account: '01020123456789012345',
    bankCode: '0102',
    bankName: 'Banco de Venezuela',
    holder: 'Redoctor C.A.',
    document: 'J-123456789',
    accountType: 'CORRIENTE',
  },
};

export function buildStartedPayment(
  method: PaymentMethod,
  overrides: Partial<IntentPayload> = {},
): StartedPaymentPayload {
  return { intent: buildIntent({ method, ...overrides }), destination };
}

export function buildCoupon(
  overrides: Partial<CouponPayload> = {},
): CouponPayload {
  return {
    code: couponCodes.twentyOff,
    name: 'Bienvenida 2026',
    discountType: 'PERCENT',
    percentOff: 20,
    amountOff: null,
    duration: 'ONCE',
    durationMonths: null,
    planIds: [],
    expiresAt: null,
    personal: false,
    ...overrides,
  };
}

/** The coupons the handlers know, by code. */
export const knownCoupons: Readonly<Record<string, CouponPayload>> = {
  [couponCodes.twentyOff]: buildCoupon(),
  [couponCodes.free]: buildCoupon({
    code: couponCodes.free,
    name: 'Primer mes gratis',
    percentOff: 100,
  }),
  [couponCodes.professionalOnly]: buildCoupon({
    code: couponCodes.professionalOnly,
    name: 'Solo Profesional',
    discountType: 'AMOUNT',
    percentOff: null,
    amountOff: usd(500),
    duration: 'REPEATING',
    durationMonths: 3,
    planIds: [planIds.professional],
    personal: true,
  }),
};

export function buildSavedCoupons(): SavedCouponPayload[] {
  return [
    {
      ...knownCoupons[couponCodes.professionalOnly],
      savedCouponId,
      state: 'AVAILABLE',
      savedAt: '2026-10-01T12:00:00.000Z',
    } as SavedCouponPayload,
  ];
}
