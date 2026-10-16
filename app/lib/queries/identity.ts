import { queryOptions } from '@tanstack/react-query';

import { identityKeys } from './identity-keys';
import { apiFetch } from '../api/client';
import { isApiError } from '../api/errors';
import { createWriteOnceGuard } from '../api/write-once';
import { mustFinishPatientSignup, type Account } from '../auth/account';
import {
  documentAvailabilitySchema,
  meResponseSchema,
  toAccount,
  type DocumentQuery,
  type PatientCompletionBody,
  type PatientRegistrationBody,
} from '../schemas/identity';

import type { TokenHolder } from '../api/types';

/*
 * The signed-in person's account, read in the browser with their Firebase
 * token (AGENTS.md §4, §9). Keyed by the Firebase uid, so a different person
 * in the same tab never sees the previous one's answer; the session provider
 * clears the whole cache on sign-out anyway.
 */

export { identityKeys } from './identity-keys';

/** The signed-in person's account (`GET /identity/me`). */
export async function readAccount(
  user: TokenHolder,
  signal?: AbortSignal,
): Promise<Account> {
  const token = await user.getToken();
  const me = await apiFetch({
    path: '/identity/me',
    token,
    schema: meResponseSchema,
    // How the API closes a session: the provider signs out and says so.
    expected: (error) =>
      error.status === 401 || error.status === 403 || error.status === 404,
    ...(signal ? { signal } : {}),
  });
  return toAccount(me);
}

export function meQueryOptions(user: TokenHolder) {
  return queryOptions({
    queryKey: identityKeys.me(user.id),
    queryFn: ({ signal }) => readAccount(user, signal),
    // Facets change in the app, rarely while the web is open.
    staleTime: 5 * 60_000,
  });
}

/*
 * The patient's sign-up (M3). Neither write may land twice (AGENTS.md §5):
 * when an answer is lost, the write-once guard looks at the account before
 * sending again. A 409 on the registration and a 403 on the completion say
 * the account already moved past that step (a second tab, a lost answer):
 * the account as the API sees it then is the answer, not an error.
 */

const registration = createWriteOnceGuard<Account>();
const completion = createWriteOnceGuard<Account>();

const isRegistered = (account: Account) =>
  account.registration !== 'pendingRegistration';

const isComplete = (account: Account) => !mustFinishPatientSignup(account);

/** When the API refuses a step as already done, the account says whether it is. */
async function alreadyDone(
  error: unknown,
  status: number,
  user: TokenHolder,
  done: (account: Account) => boolean,
): Promise<Account> {
  if (isApiError(error) && error.status === status) {
    const account = await readAccount(user);
    if (done(account)) return account;
  }
  throw error;
}

export function registerPatient(
  user: TokenHolder,
  body: PatientRegistrationBody,
): Promise<Account> {
  return registration({
    intent: `register:${user.id}`,
    send: async () => {
      try {
        const token = await user.getToken();
        const me = await apiFetch({
          method: 'POST',
          path: '/identity/register',
          token,
          body,
          schema: meResponseSchema,
          expected: (error) => error.status === 409,
        });
        return toAccount(me);
      } catch (error) {
        return alreadyDone(error, 409, user, isRegistered);
      }
    },
    findLanded: async () => {
      const account = await readAccount(user);
      return isRegistered(account) ? account : null;
    },
  });
}

export function completePatientRegistration(
  user: TokenHolder,
  body: PatientCompletionBody,
): Promise<Account> {
  return completion({
    intent: `complete:${user.id}`,
    send: async () => {
      try {
        const token = await user.getToken();
        const me = await apiFetch({
          method: 'POST',
          path: '/identity/complete-registration',
          token,
          body,
          schema: meResponseSchema,
          expected: (error) => error.status === 403,
        });
        return toAccount(me);
      } catch (error) {
        return alreadyDone(error, 403, user, isComplete);
      }
    },
    findLanded: async () => {
      const account = await readAccount(user);
      return isComplete(account) ? account : null;
    },
  });
}

/**
 * Whether nobody uses the document yet (public, no session). A read sent as
 * a POST: safe to retry.
 */
export async function isDocumentAvailable(
  query: DocumentQuery,
  signal?: AbortSignal,
): Promise<boolean> {
  const { available } = await apiFetch({
    method: 'POST',
    path: '/identity/public/check-document',
    body: query,
    schema: documentAvailabilitySchema,
    idempotent: true,
    ...(signal ? { signal } : {}),
  });
  return available;
}
