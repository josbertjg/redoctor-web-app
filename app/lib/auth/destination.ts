import { isSafeRedirect, routes } from '../routes';
import {
  canUseSpecialistArea,
  needsSignUp,
  type Account,
} from '../schemas/identity';

/*
 * Where someone goes once signed in (owner's decision, 2026-10-12): an
 * account with no sign-up behind it to the sign-up (M3), keeping the way
 * back; then back to the same-origin path they came from, when there is
 * one; a specialist (or an admin, whose tools live in the app too) to the
 * page with the app's options; a patient stays on the landing, where the
 * search lives.
 */
export function destinationAfterSignIn(
  account: Account,
  redirect: string | null | undefined,
): string {
  const back = redirect && isSafeRedirect(redirect) ? redirect : undefined;
  if (needsSignUp(account)) return routes.signUp(back);
  if (back) return back;
  if (canUseSpecialistArea(account)) return routes.specialistHome();
  return routes.home();
}
