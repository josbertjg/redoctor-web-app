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
  androidPackage: process.env.NEXT_PUBLIC_ANDROID_PACKAGE ?? '',
  appStoreId: optional(process.env.NEXT_PUBLIC_APP_STORE_ID),
  playStoreId: optional(process.env.NEXT_PUBLIC_PLAY_STORE_ID),
};
