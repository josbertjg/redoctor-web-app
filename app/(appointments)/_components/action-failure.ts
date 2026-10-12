import { isApiError, type ApiErrorMessageKey } from '@/app/lib/api/errors';

/**
 * What to say in place when a change of the appointment fails, or null
 * when the failure is the connection's: that one is announced once, for the
 * whole page (app/providers.tsx). A code the person can meet says what it
 * knows; anything else is a plain «No pudimos guardar el cambio».
 */
export function actionFailure(
  error: unknown,
): ApiErrorMessageKey | 'appointments.detail.actionFailed' | null {
  if (!isApiError(error)) return 'appointments.detail.actionFailed';
  if (error.isConnectivityProblem) return null;
  const key = error.messageKey;
  return key.startsWith('apiErrors.') && key !== 'apiErrors.unexpected'
    ? key
    : 'appointments.detail.actionFailed';
}
