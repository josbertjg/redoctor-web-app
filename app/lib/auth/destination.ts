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
  const back = unwrapAuthPages(
    redirect && isSafeRedirect(redirect) ? redirect : undefined,
  );
  if (needsSignUp(account)) return routes.signUp(back);
  if (back) return back;
  if (canUseSpecialistArea(account)) return routes.specialistHome();
  return routes.home();
}

/**
 * A way back that is itself the sign-in or the sign-up page (someone signed
 * out on the sign-up page, then in again) leads where that page would have
 * led: never one auth page wrapped in another.
 */
function unwrapAuthPages(back: string | undefined): string | undefined {
  let current = back;
  // A few levels at most: each one is a page that could only have wrapped one.
  for (let level = 0; current !== undefined && level < 4; level += 1) {
    const url = new URL(current, 'https://redoctorapp.invalid');
    if (url.pathname !== routes.signIn() && url.pathname !== routes.signUp()) {
      return current;
    }
    const inner = url.searchParams.get('redirect');
    current = inner !== null && isSafeRedirect(inner) ? inner : undefined;
  }
  return current;
}
