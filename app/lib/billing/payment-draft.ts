import type {
  Coupon,
  CouponChoice,
  Money,
  PaymentMethod,
  PaymentQuote,
} from '../schemas/billing';

/*
 * The payment left halfway (the app's PaymentDraftStorage; the owner's call
 * of 2026-11-02): a specialist who leaves to pay in their bank comes back
 * to the same step, with the price of the day. One per browser and the
 * account's own, in localStorage for seven days at most, saved from the
 * moment a way to pay is chosen and forgotten when the payment ends, when
 * the person signs out or when another account signs in. It holds the
 * reference and where the payment came from, so it never leaves this
 * browser. Every read tolerates a storage that refuses (private mode,
 * full): the payment then starts again, as it always did.
 *
 * No zod here on purpose: the session forgets the draft on every page, the
 * landing included, and the contract's schemas must not travel with it.
 */

export const PAYMENT_DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const draftKey = 'redoctor-payment-draft';

/** What the report's form held when the draft was saved. */
export type DraftReport = {
  reference: string;
  bankCode: string;
  origin: string;
  /** The day of the payment, only when the person chose it (today is the default). */
  paidOn: string | null;
  /** The amount in céntimos, only when the person typed one. */
  amountVes: number | null;
};

export type PaymentDraft = {
  userId: string;
  kind: 'contract' | 'upgrade';
  planId: string;
  /** For «Tienes un pago a medias»: the plan's name as it was. */
  planName: string;
  coupon: { choice: CouponChoice; terms: Coupon } | null;
  /** An upgrade: the coupon's loss was accepted on the change's page. */
  acceptDiscountLoss: boolean;
  /** The quote the person saw when leaving: what the next quote is compared with. */
  quote: PaymentQuote;
  /** Quotes from before each change of rate, still valid: one may be what was paid. */
  heldQuotes: PaymentQuote[];
  method: PaymentMethod;
  step: 'method' | 'pay';
  report: DraftReport;
  /** The confirmation's key and the body it went with: the same body sends it again. */
  idempotency: { key: string; body: string } | null;
  savedAt: string;
};

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isString = (value: unknown): value is string => typeof value === 'string';

const isMoney = (value: unknown): value is Money =>
  isRecord(value) &&
  typeof value.amount === 'number' &&
  Number.isInteger(value.amount) &&
  isString(value.currency);

const nullableString = (value: unknown) =>
  value === null || value === undefined || isString(value);

function isQuote(value: unknown): value is PaymentQuote {
  if (!isRecord(value)) return false;
  const destination = value.destination;
  return (
    isString(value.id) &&
    isString(value.rate) &&
    nullableString(value.rateDate) &&
    nullableString(value.expiresAt) &&
    Array.isArray(value.lines) &&
    value.lines.every(
      (line) =>
        isRecord(line) &&
        isString(line.type) &&
        isString(line.description) &&
        isMoney(line.amount),
    ) &&
    isMoney(value.total) &&
    isMoney(value.balanceApplied) &&
    isMoney(value.payable) &&
    isMoney(value.payableVes) &&
    typeof value.requiresPayment === 'boolean' &&
    isRecord(destination) &&
    (destination.mobilePayment === null ||
      isRecord(destination.mobilePayment)) &&
    (destination.bankTransfer === null || isRecord(destination.bankTransfer))
  );
}

function isReport(value: unknown): value is DraftReport {
  return (
    isRecord(value) &&
    isString(value.reference) &&
    isString(value.bankCode) &&
    isString(value.origin) &&
    (value.paidOn === null || isString(value.paidOn)) &&
    (value.amountVes === null ||
      (typeof value.amountVes === 'number' &&
        Number.isInteger(value.amountVes)))
  );
}

function isCoupon(value: unknown): value is PaymentDraft['coupon'] {
  if (value === null) return true;
  if (!isRecord(value) || !isRecord(value.choice) || !isRecord(value.terms)) {
    return false;
  }
  const { choice, terms } = value;
  return (
    (isString(choice.code) || isString(choice.savedCouponId)) &&
    isString(terms.code) &&
    isString(terms.name)
  );
}

function isDraft(value: unknown): value is PaymentDraft {
  return (
    isRecord(value) &&
    isString(value.userId) &&
    (value.kind === 'contract' || value.kind === 'upgrade') &&
    isString(value.planId) &&
    isString(value.planName) &&
    isCoupon(value.coupon) &&
    typeof value.acceptDiscountLoss === 'boolean' &&
    isQuote(value.quote) &&
    Array.isArray(value.heldQuotes) &&
    value.heldQuotes.every(isQuote) &&
    (value.method === 'MOBILE_PAYMENT' || value.method === 'BANK_TRANSFER') &&
    (value.step === 'method' || value.step === 'pay') &&
    isReport(value.report) &&
    (value.idempotency === null ||
      (isRecord(value.idempotency) &&
        isString(value.idempotency.key) &&
        isString(value.idempotency.body))) &&
    isString(value.savedAt)
  );
}

/**
 * The person's draft, or null: none, unreadable, older than seven days, or
 * another account's — which this browser no longer keeps.
 */
export function readPaymentDraft(
  userId: string,
  now: Date = new Date(),
): PaymentDraft | null {
  const store = storage();
  if (store === null) return null;
  let draft: unknown;
  try {
    const raw = store.getItem(draftKey);
    if (raw === null) return null;
    draft = JSON.parse(raw);
  } catch {
    forgetPaymentDraft();
    return null;
  }
  if (!isDraft(draft) || draft.userId !== userId) {
    forgetPaymentDraft();
    return null;
  }
  const saved = Date.parse(draft.savedAt);
  if (Number.isNaN(saved) || now.getTime() - saved > PAYMENT_DRAFT_MAX_AGE_MS) {
    forgetPaymentDraft();
    return null;
  }
  return draft;
}

export function savePaymentDraft(draft: PaymentDraft): void {
  try {
    storage()?.setItem(draftKey, JSON.stringify(draft));
  } catch {
    // Storage refused: the payment simply starts again next time.
  }
}

/** Forgets it: the payment ended, the person signed out, or another one signed in. */
export function forgetPaymentDraft(): void {
  try {
    storage()?.removeItem(draftKey);
  } catch {
    // Nothing to forget where nothing could be kept.
  }
}
