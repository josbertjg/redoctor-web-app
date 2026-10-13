import { isApiError, type ApiErrorMessageKey } from '@/app/lib/api/errors';

type FallbackKey = 'appointments.detail.actionFailed' | 'reviews.rate.failed';

/**
 * What to say in place when a write fails, or null when the failure is the
 * connection's: that one is announced once, for the whole page
 * (app/providers.tsx). A code the person can meet says what it knows;
 * anything else is the flow's plain «No pudimos…» (`fallback`).
 */
export function actionFailure<Fallback extends FallbackKey>(
  error: unknown,
  fallback: Fallback = 'appointments.detail.actionFailed' as Fallback,
): ApiErrorMessageKey | Fallback | null {
  if (!isApiError(error)) return fallback;
  if (error.isConnectivityProblem) return null;
  const key = error.messageKey;
  return key.startsWith('apiErrors.') && key !== 'apiErrors.unexpected'
    ? key
    : fallback;
}
