import { originParameter } from './deep-links';

/*
 * Every route path of the web is built here and nowhere else (the app has
 * `AppRoutes` for the same reason). The builders return literal and template
 * types, so `typedRoutes` validates them where they are used (`<Link>`,
 * `router.push`): a builder whose page does not exist yet fails to compile at
 * the call site, never silently at runtime.
 *
 * URL segments are English (owner, 2026-10-12). What the path says is who
 * it is for: the short links people share at the top (`/s`, `/i`, `/a`),
 * the specialist's panel under `/panel/`, and the payment at `/pay`, out
 * of the panel's paths so that no app ever opens it. The app opens only
 * the pages it lists, one by one (`universalLinkComponents`, AGENTS.md §6):
 * a page of the web's alone, under `/panel/` too, needs nothing there. A
 * renamed path keeps answering with a redirect (next.config.ts).
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
  /** «Mi perfil»: what patients see of the specialist, read only (edited in the app). */
  specialistProfile: () => '/panel/profile' as const,
  /** «Mis especialidades»: each one and where its review stands. */
  specialties: () => '/panel/specialties' as const,
  subscription: () => '/panel/subscription' as const,
  /** The receipts, the newest first; `status` keeps one kind (`open`, `paid`, `voided`, `uncollectible`). */
  subscriptionInvoices: (status?: string) =>
    status
      ? (`/panel/subscription/invoices?status=${encodeURIComponent(status)}` as const)
      : ('/panel/subscription/invoices' as const),
  subscriptionInvoice: (invoiceId: string) =>
    `/panel/subscription/invoices/${segment(invoiceId)}` as const,
  /** The balance and its movements. */
  subscriptionBalance: () => '/panel/subscription/balance' as const,
  /** «Mis cupones»: the codes kept for later, and the personal ones. */
  subscriptionCoupons: () => '/panel/subscription/coupons' as const,

  /*
   * The payment (M13): `/pay`, out of `/panel/` on purpose (the owner,
   * 2026-10-13), so no app lists it and none ever opens it; the app never
   * links to it either. `plan` (a slug) is the plan to take, or to change
   * to: what a feature the plan lacks invites to.
   */
  subscriptionPay: (plan?: string) =>
    plan
      ? (`/pay?plan=${encodeURIComponent(plan)}` as const)
      : ('/pay' as const),
  /** The plans, to change from the one in force (or to take one). */
  subscriptionPlans: () => '/pay?view=plans' as const,
  /** One receipt to pay, the one its page shows. */
  subscriptionPayInvoice: (invoiceId: string) =>
    `/pay?invoice=${encodeURIComponent(invoiceId)}` as const,

  /* Legal (M10). */
  privacy: () => '/privacy' as const,
  terms: () => '/terms' as const,
  deleteAccount: () => '/delete-account' as const,

  /** The app's internal paths (`/home/*`): never a web page of their own (M11). */
  homeBridge: (rest: readonly string[] = []) =>
    rest.length === 0
      ? ('/home' as const)
      : (`/home/${rest.map(segment).join('/')}` as const),

  /* Daily-summary opt-out from the specialist's email (M11). */
  dailySummaryOptOut: (token: string) =>
    `/daily-summary/unsubscribe?token=${encodeURIComponent(token)}` as const,
};

/**
 * The query parameter of a search box (the panel's history): what a person
 * typed — a patient's name, document, phone or email —, so it never
 * travels further than its own page (`returnPath`).
 */
export const searchParameter = 'q';

/**
 * The way back to a page after signing in: its path and its query — the
 * plan a link asks for, a list's filters —, minus what must not travel: a
 * search box's text and the channel tag `?origin=`. The sign-in page's own
 * address reaches Firebase's sign-in window whole (its `redirectUrl`), so
 * nothing a person typed rides in it.
 */
export function returnPath(pathname: string, search: string): string {
  const params = new URLSearchParams(search);
  params.delete(searchParameter);
  params.delete(originParameter);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

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
