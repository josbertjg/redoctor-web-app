import { env } from './env';

/*
 * Every route path of the web is built here and nowhere else (the app has
 * `AppRoutes` for the same reason). The builders return literal and template
 * types, so `typedRoutes` validates them where they are used (`<Link>`,
 * `router.push`): a builder whose page does not exist yet fails to compile at
 * the call site, never silently at runtime.
 *
 * URL segments are Spanish and fixed: the ones shared with the app are a
 * contract (app/lib/deep-links.ts); the payment route comes from the
 * environment until its name is decided (AGENTS.md §13).
 */

const segment = (value: string) => encodeURIComponent(value);

export const routes = {
  home: () => '/' as const,

  /* Session (M2). `redirect` is a same-origin path to return to. */
  signIn: (redirect?: string) =>
    redirect
      ? (`/entrar?redirect=${encodeURIComponent(redirect)}` as const)
      : ('/entrar' as const),

  /* Paths shared with the app (AGENTS.md §6). */
  specialist: (specialistId: string) => `/s/${segment(specialistId)}` as const,
  invitation: (token: string) => `/i/${segment(token)}` as const,
  appointment: (appointmentId: string) =>
    `/a/${segment(appointmentId)}` as const,

  /* Patient (M6, M10). */
  appointments: () => '/citas' as const,
  account: () => '/cuenta' as const,

  /* Legal (M10). */
  privacy: () => '/privacidad' as const,
  terms: () => '/terminos' as const,
  deleteAccount: () => '/eliminar-cuenta' as const,

  /* Specialist payment (M13): never an app path, never linked from the app. */
  payment: () => env.NEXT_PUBLIC_PAYMENT_PATH,

  /* Bridges that only open the app (M11). */
  subscriptionBridge: () => '/suscripcion' as const,
  agendaBridge: (date?: string) =>
    date ? (`/agenda/${segment(date)}` as const) : ('/agenda' as const),
  specialtiesBridge: () => '/especialidades' as const,
  profileBridge: () => '/perfil' as const,
  /** The app's internal paths (`/home/*`): never a web page of their own. */
  homeBridge: (rest: readonly string[] = []) =>
    rest.length === 0
      ? ('/home' as const)
      : (`/home/${rest.map(segment).join('/')}` as const),

  /* Daily-summary opt-out from the specialist's email (M11). */
  dailySummaryOptOut: (token: string) =>
    `/resumen/baja?token=${encodeURIComponent(token)}` as const,
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
