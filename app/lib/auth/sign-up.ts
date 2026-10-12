import { isSafeRedirect } from '../routes';
import {
  mustFinishPatientSignup,
  needsSignUp,
  specialistMustFinishInApp,
  type Account,
} from '../schemas/identity';

/*
 * What `/sign-up` asks of the person (M3, owner's scope of 2026-10-12):
 * the web signs up patients only. A specialist's sign-up happens in the
 * app, so the web points them there — to support while the app is in
 * testing, to the store once it is published.
 *
 * Like the app, the patient's sign-up comes in two parts: the names and the
 * consents, and later, only when a flow needs it, the personal data. The
 * one flow that needs it on the web is claiming an invitation (M4), and
 * then both parts share one screen (AGENTS.md §1: «one screen»).
 */

export type SignUpPlan =
  /** A brand-new account outside an invitation: patient or specialist? */
  | { step: 'choose-role' }
  | { step: 'patient'; register: boolean; personalData: boolean }
  /** A specialist's open sign-up: it is finished in the app. */
  | { step: 'specialist-in-app' }
  /** Nothing to ask: on to where the person was going. */
  | { step: 'done' };

/** The flows that need a patient whose sign-up is complete: claiming an invitation. */
export function flowNeedsPersonalData(
  redirect: string | null | undefined,
): boolean {
  return (
    typeof redirect === 'string' &&
    isSafeRedirect(redirect) &&
    redirect.startsWith('/i/')
  );
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
