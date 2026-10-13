/*
 * The public variables that client components need, read as Next.js inlines
 * them into the browser bundle. app/lib/env.ts validated them when
 * next.config.ts loaded it, so the build already failed if one was missing
 * or malformed; reading them here keeps zod and t3-env out of the browser
 * (≈30 KB gzip on every page that uses them, AGENTS.md §8.10).
 *
 * Server code keeps importing env.ts. Each `process.env.NEXT_PUBLIC_*` must
 * be written out in full: Next.js only inlines literal accesses.
 */

const optional = (value: string | undefined) =>
  value === undefined || value === '' ? undefined : value;

export const publicEnv = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? '',
  /** The API's base URL; the API client runs on both sides (app/lib/api/client.ts). */
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? '',
  androidPackage: process.env.NEXT_PUBLIC_ANDROID_PACKAGE ?? '',
  appStoreId: optional(process.env.NEXT_PUBLIC_APP_STORE_ID),
  playStoreId: optional(process.env.NEXT_PUBLIC_PLAY_STORE_ID),
  /** `Label|+number` entries (app/lib/support.ts), until REDOC-357. */
  supportWhatsapp: process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? '',
  supportPhones: process.env.NEXT_PUBLIC_SUPPORT_PHONES ?? '',
  /**
   * The Firebase web app of the project shared with the mobile app, for Auth
   * only (AGENTS.md §2). Public by design (§11): the key is restricted by
   * referrer in Google Cloud. Analytics stays off, so no measurement id.
   */
  firebase: {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
  },
};
