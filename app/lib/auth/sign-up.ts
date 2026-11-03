import { isSafeRedirect } from '../routes';
import {
  mustFinishPatientSignup,
  needsSignUp,
  specialistMustFinishInApp,
  type Account,
} from './account';

/*
 * What `/sign-up` asks of the person (M3; specialists too since the owner's
 * word of 2026-11-03). It starts as the app's does: who they are, then the
 * account — Google or Apple, in place —, then the form of the role chosen.
 * A specialist's sign-up is finished in the app (their specialties and
 * licence), so the web creates the account and hands them over.
 *
 * Like the app, the patient's sign-up comes in two parts: the names and the
 * consents, and later, only when a flow needs it, the personal data. Two
 * flows need it on the web, as in the app: claiming an invitation (M4) and
 * booking from a profile (M15); then both parts share one screen
 * (AGENTS.md §1: «one screen»), and the flow says the person is a patient.
 */

/** Who the person says they are, in the address of the sign-up (`?as=`). */
export type SignUpRole = 'patient' | 'specialist';

export function signUpRoleOf(
  value: string | null | undefined,
): SignUpRole | null {
  return value === 'patient' || value === 'specialist' ? value : null;
}

export type SignUpPlan =
  /** Patient or specialist? */
  | { step: 'choose-role' }
  /** A stranger: the account first, with Google or Apple, for the role chosen. */
  | { step: 'create'; role: SignUpRole; canGoBack: boolean }
  | { step: 'patient'; register: boolean; personalData: boolean }
  /** A brand-new account that chose to be a specialist: the app's form. */
  | { step: 'specialist' }
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

/**
 * `account` is `null` for a stranger. A flow that needs a patient (an
 * invitation, a booking) says the role itself: the person is never asked.
 */
export function planSignUp(
  account: Account | null,
  redirect: string | null | undefined,
  role: SignUpRole | null,
): SignUpPlan {
  const personalData = flowNeedsPersonalData(redirect);
  const chosen = personalData ? 'patient' : role;

  if (account === null) {
    return chosen === null
      ? { step: 'choose-role' }
      : { step: 'create', role: chosen, canGoBack: !personalData };
  }
  if (needsSignUp(account)) {
    if (chosen === 'specialist') return { step: 'specialist' };
    return chosen === 'patient'
      ? { step: 'patient', register: true, personalData }
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
