import { isSafeRedirect } from '../routes';
import {
  mustFinishPatientSignup,
  needsSignUp,
  specialistMustFinishInApp,
  type Account,
} from './account';

/*
 * What `/sign-up` asks of the person (M3, owner's scope of 2026-10-12):
 * the web signs up patients only. A specialist's sign-up happens in the
 * app, so the web points them there — to support while the app is in
 * testing, to the store once it is published.
 *
 * Like the app, the patient's sign-up comes in two parts: the names and the
 * consents, and later, only when a flow needs it, the personal data. Two
 * flows need it on the web, as in the app: claiming an invitation (M4) and
 * booking from a profile (M15); then both parts share one screen
 * (AGENTS.md §1: «one screen»).
 */

export type SignUpPlan =
  /** A brand-new account outside an invitation: patient or specialist? */
  | { step: 'choose-role' }
  | { step: 'patient'; register: boolean; personalData: boolean }
  /** A specialist's open sign-up: it is finished in the app. */
  | { step: 'specialist-in-app' }
  /** Nothing to ask: on to where the person was going. */
  | { step: 'done' };

/** A flow that needs a patient whose sign-up is complete. */
export type SignUpPurpose = 'claim' | 'book';

/**
 * The flow a sign-up comes from, by where it returns: claiming an
 * invitation (`/i/{token}`) or booking (`/book/{specialistId}`).
 */
export function signUpPurposeOf(
  redirect: string | null | undefined,
): SignUpPurpose | null {
  if (typeof redirect !== 'string' || !isSafeRedirect(redirect)) return null;
  if (redirect.startsWith('/i/')) return 'claim';
  if (redirect.startsWith('/book/')) return 'book';
  return null;
}

export function flowNeedsPersonalData(
  redirect: string | null | undefined,
): boolean {
  return signUpPurposeOf(redirect) !== null;
}

/**
 * The invitation a sign-up comes from (`redirect` is `/i/{token}`), and
 * whether the person said the appointment is theirs (`?for=self`): only
 * then does the form start from the invitation's data.
 */
export function invitationOf(
  redirect: string | null | undefined,
): { token: string; forSelf: boolean } | null {
  if (!redirect || signUpPurposeOf(redirect) !== 'claim') return null;
  const url = new URL(redirect, 'https://redoctorapp.invalid');
  const token = /^\/i\/([^/]+)$/.exec(url.pathname)?.[1];
  if (token === undefined) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(token);
  } catch {
    // A link cut in the middle of an escape: there is no invitation to name.
    return null;
  }
  return { token: decoded, forSelf: url.searchParams.get('for') === 'self' };
}

export function planSignUp(
  account: Account,
  redirect: string | null | undefined,
): SignUpPlan {
  const personalData = flowNeedsPersonalData(redirect);

  if (needsSignUp(account)) {
    // An invitation is for a patient: nobody needs to say who they are.
    return personalData
      ? { step: 'patient', register: true, personalData: true }
      : { step: 'choose-role' };
  }
  if (!account.patient.exists && specialistMustFinishInApp(account)) {
    return { step: 'specialist-in-app' };
  }
  if (personalData && mustFinishPatientSignup(account)) {
    return { step: 'patient', register: false, personalData: true };
  }
  return { step: 'done' };
}
