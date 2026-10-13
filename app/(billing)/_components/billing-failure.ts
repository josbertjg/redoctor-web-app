import { isApiError, type ApiErrorMessageKey } from '@/app/lib/api/errors';

type FallbackKey =
  | 'billing.acquire.method.failed'
  | 'billing.acquire.confirm.failed'
  | 'billing.acquire.coupon.failed';

/**
 * What to say in place when a billing write fails, or null when the failure
 * is the connection's: that one is announced once, for the whole page
 * (app/providers.tsx). A code the person can meet says what it knows (the
 * billing codes of AGENTS.md §5); anything else is the step's plain «No
 * pudimos…» (`fallback`).
 */
export function billingFailure<Fallback extends FallbackKey>(
  error: unknown,
  fallback: Fallback,
): ApiErrorMessageKey | Fallback | null {
  if (!isApiError(error)) return fallback;
  if (error.isConnectivityProblem) return null;
  const key = error.messageKey;
  return key.startsWith('apiErrors.') && key !== 'apiErrors.unexpected'
    ? key
    : fallback;
}
