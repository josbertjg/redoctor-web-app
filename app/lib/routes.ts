import { env } from './env';

/*
 * Every route path of the web is built here and nowhere else (the app has
 * `AppRoutes` for the same reason). The builders return literal and template
 * types, so `typedRoutes` validates them where they are used (`<Link>`,
 * `router.push`): a builder whose page does not exist yet fails to compile at
 * the call site, never silently at runtime.
 *
 * URL segments are English (owner, 2026-10-12). What the path says is who
 * it is for: the short links people share at the top (`/s`, `/i`, `/a`),
 * the specialist's pages that the app opens under `/panel/`, and the payment
 * outside it on purpose (AGENTS.md §6). A renamed path keeps answering with
 * a redirect (next.config.ts). The payment route comes from the environment
 * until its name is decided (AGENTS.md §13).
 */

const segment = (value: string) => encodeURIComponent(value);

/** `/panel/agenda` opens today; `/panel/agenda/{YYYY-MM-DD}` that day. */
function agendaBridge(): '/panel/agenda';
function agendaBridge(date: string): `/panel/agenda/${string}`;
function agendaBridge(date?: string) {
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

  /* Specialist (M2): the page with the app's options, after signing in. */
  specialistHome: () => '/panel' as const,

  /* Legal (M10). */
  privacy: () => '/privacy' as const,
  terms: () => '/terms' as const,
  deleteAccount: () => '/delete-account' as const,

  /* Specialist payment (M13): never an app path, never linked from the app. */
  payment: () => env.NEXT_PUBLIC_PAYMENT_PATH,

  /* The specialist's pages the app opens (M11): bridges on the web. */
  subscriptionBridge: () => '/panel/subscription' as const,
  agendaBridge,
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
    return new URL(value, base).origin === base;
  } catch {
    return false;
  }
}
