/*
 * Every route path of the web is built here and nowhere else (the app has
 * `AppRoutes` for the same reason). The builders return literal and template
 * types, so `typedRoutes` validates them where they are used (`<Link>`,
 * `router.push`): a builder whose page does not exist yet fails to compile at
 * the call site, never silently at runtime.
 *
 * URL segments are English (owner, 2026-10-12). What the path says is who
 * it is for: the short links people share at the top (`/s`, `/i`, `/a`),
 * and the specialist's panel under `/panel/`, which the app opens on a
 * phone where it is installed — all but the payment page, kept out of the
 * app's paths on purpose (AGENTS.md §6). A renamed path keeps answering
 * with a redirect (next.config.ts).
 */

const segment = (value: string) => encodeURIComponent(value);

/** `/panel/agenda` shows today; `/panel/agenda/{YYYY-MM-DD}` that day. */
function agenda(): '/panel/agenda';
function agenda(date: string): `/panel/agenda/${string}`;
function agenda(date?: string) {
  return date
    ? (`/panel/agenda/${segment(date)}` as const)
    : ('/panel/agenda' as const);
}

export const routes = {
  home: () => '/' as const,

  /* Session (M2) and sign-up (M3). `redirect` is a same-origin path to return to. */
  signIn: (redirect?: string) =>
    redirect
      ? (`/sign-in?redirect=${encodeURIComponent(redirect)}` as const)
      : ('/sign-in' as const),
  signUp: (redirect?: string) =>
    redirect
      ? (`/sign-up?redirect=${encodeURIComponent(redirect)}` as const)
      : ('/sign-up' as const),

  /* Paths shared with the app (AGENTS.md §6). */
  specialist: (specialistId: string) => `/s/${segment(specialistId)}` as const,
  /** `claimFor` keeps the person's answer to «¿Para quién es esta cita?» across the sign-up. */
  invitation: (token: string, claimFor?: 'self' | 'dependent') =>
    claimFor
      ? (`/i/${segment(token)}?for=${claimFor}` as const)
      : (`/i/${segment(token)}` as const),
  appointment: (appointmentId: string) =>
    `/a/${segment(appointmentId)}` as const,

  /* Patient (M6, M10). */
  appointments: () => '/appointments' as const,
  account: () => '/account' as const,

  /*
   * The specialist's panel (M14): where a specialist lands after signing in
   * and stays until signing out. Each section is the web's side of the
   * app's screen with the same path.
   */
  specialistHome: () => '/panel' as const,
  agenda,
  specialistAppointments: () => '/panel/appointments' as const,
  reports: () => '/panel/reports' as const,
  subscription: () => '/panel/subscription' as const,
  /*
   * The payment (M13; the owner's path of 2026-10-13): never opened by the
   * app, never linked from it. `plan` (a slug) is the plan to take, or to
   * change to: what a feature the plan lacks invites to.
   */
  subscriptionPay: (plan?: string) =>
    plan
      ? (`/panel/subscription/pay?plan=${encodeURIComponent(plan)}` as const)
      : ('/panel/subscription/pay' as const),

  /* Legal (M10). */
  privacy: () => '/privacy' as const,
  terms: () => '/terms' as const,
  deleteAccount: () => '/delete-account' as const,

  /* The specialist's pages that still only open the app (M11). */
  specialtiesBridge: () => '/panel/specialties' as const,
  profileBridge: () => '/panel/profile' as const,
  /** The app's internal paths (`/home/*`): never a web page of their own. */
  homeBridge: (rest: readonly string[] = []) =>
    rest.length === 0
      ? ('/home' as const)
      : (`/home/${rest.map(segment).join('/')}` as const),

  /* Daily-summary opt-out from the specialist's email (M11). */
  dailySummaryOptOut: (token: string) =>
    `/daily-summary/unsubscribe?token=${encodeURIComponent(token)}` as const,
};

/**
 * A `redirect` value is honored only when it is a same-origin path, so a
 * crafted link cannot send someone elsewhere after signing in.
 */
export function isSafeRedirect(value: string | null | undefined): boolean {
  if (!value?.startsWith('/')) return false;
  if (value.startsWith('//') || value.startsWith('/\\')) return false;
  try {
    const base = 'https://redoctorapp.invalid';
    const url = new URL(value, base);
    // `/..//evil.com` resolves to the path `//evil.com`: the browser would
    // take it for another host once the path is used on its own.
    return url.origin === base && !url.pathname.startsWith('//');
  } catch {
    return false;
  }
}
