import type { Device } from './platform';

/*
 * The URL space shared with the mobile app (AGENTS.md §6). The app claims
 * these paths as App Links / Universal Links: when it is installed, tapping
 * them opens the app; when it is not, they open this web. The payment page
 * is never one of them.
 *
 * Mirrors `AppDeepLinks` and `LinkOrigin` of the app
 * (lib/config/router/app_deep_links.dart).
 */

/** The app's own scheme: the fallback when a https link stays in the browser. */
export const appScheme = 'redoctor';

export type UniversalLinkComponent = {
  /** A path, or a prefix ending in `*`. */
  readonly path: string;
  /** A path the app must leave to the browser, though a later pattern would take it. */
  readonly exclude?: true;
};

/**
 * What the app opens, as published in
 * /.well-known/apple-app-site-association and in its order (a test keeps the
 * two equal): the short links people share, everything under `/panel/` (the
 * specialist's panel; `/panel` itself is the web's) and its internal paths.
 * iOS reads them from there, first match first; Android from the app's
 * manifest. The one exception under `/panel/` is the payment page: the app
 * cannot charge (the stores forbid it), so a link to pay must reach this
 * web even on a phone with the app. A new page under `/panel/` needs no
 * change here: only the app's router. The Spanish names of before
 * 2026-10-12 are only redirects now (next.config.ts).
 */
export const universalLinkComponents = [
  { path: '/s/*' },
  { path: '/i/*' },
  { path: '/a/*' },
  { path: '/panel/subscription/pay', exclude: true },
  { path: '/panel/subscription/pay/*', exclude: true },
  { path: '/panel/*' },
  { path: '/home/*' },
] as const satisfies readonly UniversalLinkComponent[];

const matches = (pattern: string, path: string) =>
  pattern.endsWith('*')
    ? path.startsWith(pattern.slice(0, -1))
    : path === pattern;

/**
 * Whether the app opens a site path, reading the patterns as iOS does: the
 * first that matches decides, and `*` covers the rest of the path, so
 * `/panel/*` takes `/panel/agenda` and leaves `/panel` to the web.
 */
export function isAppOwnedPath(path: string): boolean {
  const pathname = path.split(/[?#]/, 1)[0] ?? path;
  const component: UniversalLinkComponent | undefined =
    universalLinkComponents.find((candidate) =>
      matches(candidate.path, pathname),
    );
  return component !== undefined && component.exclude !== true;
}

/* ---------- ?origin= (measurement only, AGENTS.md §6) ------------------ */

/** Query parameter that says through which channel a link reached the patient. */
export const originParameter = 'origin';

/** Origins the app sets on the links it hands out (`LinkOrigin`). */
export const appLinkOrigins = [
  'whatsapp-invitation',
  'whatsapp-reminder',
  'whatsapp-confirm',
  'whatsapp-admin',
  'share-invitation',
  'share-admin',
  'share-profile',
] as const;

/** The API's patient emails use `email-{N}`, N being the email number. */
export type EmailOrigin = `email-${number}`;
export type LinkOrigin = (typeof appLinkOrigins)[number] | EmailOrigin;

const emailOriginPattern = /^email-\d{1,3}$/;

/** A known origin, or undefined for anything else (never trusted as is). */
export function parseLinkOrigin(
  value: string | null | undefined,
): LinkOrigin | undefined {
  if (!value) return undefined;
  if ((appLinkOrigins as readonly string[]).includes(value)) {
    return value as LinkOrigin;
  }
  return emailOriginPattern.test(value) ? (value as EmailOrigin) : undefined;
}

/**
 * The URL without `?origin=`: what canonical links and anything the web
 * shares must use, so a channel tag never travels further.
 */
export function withoutOrigin(url: string | URL): string {
  const clean = new URL(url);
  clean.searchParams.delete(originParameter);
  return clean.toString();
}

/* ---------- "Abrir en la app" ------------------------------------------- */

/**
 * The same URL with the scheme swapped and nothing else:
 * `https://redoctorapp.com/a/1` → `redoctor://redoctorapp.com/a/1`.
 * The app reads only the path, so the host is kept (a host-less
 * `redoctor://a/1` would make the app read `a` as the host).
 */
export function toAppSchemeUrl(url: string | URL): string {
  const target = new URL(url);
  target.hash = '';
  return target.toString().replace(/^https?:/, `${appScheme}:`);
}

/**
 * Chrome on Android: an intent:// link opens the app through its scheme and,
 * when the app is missing, falls back to `fallbackUrl` instead of failing
 * silently (the Play listing once it exists, this same page until then).
 */
export function toAndroidIntentUrl(
  url: string | URL,
  androidPackage: string,
  fallbackUrl: string,
): string {
  const target = new URL(url);
  target.hash = '';
  const withoutScheme = target.toString().replace(/^https?:\/\//, '');
  return (
    `intent://${withoutScheme}#Intent;scheme=${appScheme};package=${androidPackage};` +
    `S.browser_fallback_url=${encodeURIComponent(fallbackUrl)};end`
  );
}

/** App Store listing URL, or undefined while the id is empty (pilot). */
export function appStoreUrl(
  appStoreId: string | undefined,
): string | undefined {
  return appStoreId ? `https://apps.apple.com/app/id${appStoreId}` : undefined;
}

/** Google Play listing URL, or undefined while the id is empty (pilot). */
export function playStoreUrl(
  playStoreId: string | undefined,
): string | undefined {
  return playStoreId
    ? `https://play.google.com/store/apps/details?id=${encodeURIComponent(playStoreId)}`
    : undefined;
}

/** The app's identity on each platform and its store listings. */
export type AppBridgeConfig = {
  androidPackage: string;
  appStoreId?: string | undefined;
  playStoreId?: string | undefined;
};

/** Which links the bridge offers on one device. */
export type AppBridgeLinks = {
  /** «Abrir en la app»; undefined on a computer, where there is no app. */
  openApp: string | undefined;
  /** Store listings worth offering here: on a phone, only its own. */
  appStore: string | undefined;
  playStore: string | undefined;
  /** The store to send the person to after a pause, if it exists. */
  storeRedirect: string | undefined;
};

/**
 * The bridge's links for a page and a device, as the prototype's
 * app-bridge.js decided them. Store links stay off while the ids are empty.
 */
export function appBridgeLinks(
  pageUrl: string,
  device: Device,
  config: AppBridgeConfig,
): AppBridgeLinks {
  const appStore = appStoreUrl(config.appStoreId);
  const playStore = playStoreUrl(config.playStoreId);

  let openApp: string | undefined;
  if (device.isAndroidChrome) {
    openApp = toAndroidIntentUrl(
      pageUrl,
      config.androidPackage,
      playStore ?? pageUrl,
    );
  } else if (!device.isDesktop) {
    openApp = toAppSchemeUrl(pageUrl);
  }

  return {
    openApp,
    appStore: device.isAndroid ? undefined : appStore,
    playStore: device.isIOS ? undefined : playStore,
    storeRedirect: device.isIOS
      ? appStore
      : device.isAndroid
        ? playStore
        : undefined,
  };
}
