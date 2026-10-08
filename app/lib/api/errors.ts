/*
 * Every failure of an API call becomes an `ApiError` (AGENTS.md §5): business
 * errors carry the API's `ERR_xxxx` code, mapped to our copy when the person
 * can meet it and understand it; transport failures say what kind they are.
 * Mirrors the app's `ErrorHandler` (features/shared/infrastructure/error).
 */

export type ApiErrorKind =
  /** The API answered with an error status. */
  | 'http'
  /** The request could not reach the API (offline, DNS, refused). */
  | 'network'
  /** No answer in time; for a read it may be retried. */
  | 'timeout'
  /** A write went out and its answer was lost: it may or may not have landed. */
  | 'uncertain'
  /** The API answered 2xx with a body that breaks the contract. */
  | 'invalid-response'
  /** The caller cancelled the request. */
  | 'aborted';

/** i18n keys of the API errors the web shows (app/lib/i18n/messages/es.json). */
export type ApiErrorMessageKey =
  | 'apiErrors.network'
  | 'apiErrors.timeout'
  | 'apiErrors.uncertainOutcome'
  | 'apiErrors.unexpected'
  | 'apiErrors.genericCustomErrors.registrationIncomplete'
  | 'apiErrors.notificationErrors.invalidUnsubscribeLink'
  | `apiErrors.billingErrors.${
      | 'alreadySubscribed'
      | 'invalidTransition'
      | 'planUnavailable'
      | 'changeWithDebt'
      | 'changeOverOfficeLimit'
      | 'changeNotAllowed'
      | 'paymentExpired'
      | 'paymentInReview'
      | 'noExchangeRate'
      | 'discountActive'
      | 'discountLossNotAccepted'
      | 'subscriptionRequired'}`
  | `billing.couponRejection.${
      'invalid' | 'expired' | 'usageLimit' | 'wrongPlan' | 'unavailable'}`;

/** Codes whose message the person can meet on the web, with our copy. */
export const messageKeysByCode: Readonly<Record<string, ApiErrorMessageKey>> = {
  // Specialist payment (M13).
  ERR_5071: 'apiErrors.billingErrors.alreadySubscribed',
  ERR_5073: 'apiErrors.billingErrors.invalidTransition',
  ERR_5074: 'apiErrors.billingErrors.planUnavailable',
  ERR_5075: 'apiErrors.billingErrors.changeWithDebt',
  ERR_5076: 'apiErrors.billingErrors.changeOverOfficeLimit',
  ERR_5077: 'apiErrors.billingErrors.changeNotAllowed',
  ERR_5083: 'apiErrors.billingErrors.paymentExpired',
  ERR_5084: 'apiErrors.billingErrors.paymentInReview',
  ERR_5085: 'apiErrors.billingErrors.noExchangeRate',
  ERR_5106: 'apiErrors.billingErrors.discountActive',
  ERR_5108: 'apiErrors.billingErrors.discountLossNotAccepted',
  ERR_5101: 'billing.couponRejection.invalid',
  ERR_5103: 'billing.couponRejection.expired',
  ERR_5104: 'billing.couponRejection.usageLimit',
  ERR_5105: 'billing.couponRejection.wrongPlan',
  ERR_5109: 'billing.couponRejection.unavailable',
  // Daily-summary opt-out link (M11).
  ERR_8004: 'apiErrors.notificationErrors.invalidUnsubscribeLink',
};

/** Same idea for 403s: a code only means this when it comes with that status. */
export const forbiddenMessageKeysByCode: Readonly<
  Record<string, ApiErrorMessageKey>
> = {
  // A patient route with the sign-up half done (claim, book).
  ERR_2010: 'apiErrors.genericCustomErrors.registrationIncomplete',
  // A specialist booking without an active plan.
  ERR_5052: 'apiErrors.billingErrors.subscriptionRequired',
};

/** Codes that are part of a normal flow and need no report. */
const expectedCodes = new Set([
  // Not found (e.g. a specialist profile that does not exist).
  'ERR_3030',
]);

type ApiErrorInit = {
  kind: ApiErrorKind;
  method: string;
  /** The route template, never the real path: it can carry a token. */
  path: string;
  status?: number | undefined;
  code?: string | undefined;
  details?: Record<string, unknown> | undefined;
  cause?: unknown;
};

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly method: string;
  readonly path: string;
  readonly status: number | undefined;
  readonly code: string | undefined;
  readonly details: Record<string, unknown> | undefined;

  constructor(init: ApiErrorInit) {
    super(
      `${init.method} ${init.path} failed (${init.kind}${
        init.status === undefined ? '' : ` ${init.status}`
      }${init.code === undefined ? '' : ` ${init.code}`})`,
      { cause: init.cause },
    );
    this.name = 'ApiError';
    this.kind = init.kind;
    this.method = init.method;
    this.path = init.path;
    this.status = init.status;
    this.code = init.code;
    this.details = init.details;
  }

  /** The key of the copy to show for this error. */
  get messageKey(): ApiErrorMessageKey {
    switch (this.kind) {
      case 'network':
        return 'apiErrors.network';
      case 'timeout':
        return 'apiErrors.timeout';
      case 'uncertain':
        return 'apiErrors.uncertainOutcome';
      default:
        return this.knownMessageKey ?? 'apiErrors.unexpected';
    }
  }

  /** Our copy for the API code, when the code is one the person can meet. */
  get knownMessageKey(): ApiErrorMessageKey | undefined {
    if (this.code === undefined) return undefined;
    if (this.status === 403) {
      const forbidden = forbiddenMessageKeysByCode[this.code];
      if (forbidden) return forbidden;
    }
    return messageKeysByCode[this.code];
  }

  /**
   * Transport failures, announced once and globally, never per widget
   * (app/providers.tsx). A lost answer ('uncertain') is not one of them: the
   * flow that sent the write explains it in place, after the write-once guard
   * looked for it.
   */
  get isConnectivityProblem(): boolean {
    return this.kind === 'network' || this.kind === 'timeout';
  }

  /**
   * Whether this deserves an error report: unknown business codes and broken
   * contracts. Connectivity, cancellations and expected codes do not.
   */
  get isReportable(): boolean {
    if (this.kind === 'invalid-response') return true;
    if (this.kind !== 'http') return false;
    if (this.code !== undefined && expectedCodes.has(this.code)) return false;
    return this.knownMessageKey === undefined;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
