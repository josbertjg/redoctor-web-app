import { isSafeRedirect, routes } from '../routes';
import { canUseSpecialistArea, type Account } from '../schemas/identity';

/*
 * Where someone goes once signed in (owner's decision, 2026-10-12): back to
 * the same-origin path they came from, when there is one; a specialist (or
 * an admin, whose tools live in the app too) to the page with the app's
 * options; a patient stays on the landing, where the search lives.
 */
export function destinationAfterSignIn(
  account: Account,
  redirect: string | null | undefined,
): string {
  if (redirect && isSafeRedirect(redirect)) return redirect;
  if (canUseSpecialistArea(account)) return routes.specialistHome();
  return routes.home();
}
