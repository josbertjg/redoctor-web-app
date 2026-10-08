import type { Device } from './platform';

/*
 * The URL space shared with the mobile app (AGENTS.md §6). The app claims
 * these paths as App Links / Universal Links: when it is installed, tapping
 * them opens the app; when it is not, they open this web. The payment route
 * is never one of them.
 *
 * Mirrors `AppDeepLinks` and `LinkOrigin` of the app
 * (lib/config/router/app_deep_links.dart).
 */

/** The app's own scheme: the fallback when a https link stays in the browser. */
export const appScheme = 'redoctor';

/** First path segments the app owns. */
export const appPathSegments = [
  's',
  'i',
  'a',
  'suscripcion',
  'home',
  'agenda',
  'especialidades',
  'perfil',
] as const;

export type AppPathSegment = (typeof appPathSegments)[number];

/**
 * The paths published in /.well-known/apple-app-site-association, in its
 * order. A new bridge path needs the AASA, the app's manifest and this list
 * updated together (and Apple's CDN to pick it up). The specialist bridges
 * (`/agenda`, `/especialidades`, `/perfil`) open the app since its v0.161.0.
 */
export const universalLinkPaths = [
  '/s/*',
  '/i/*',
  '/a/*',
  '/suscripcion',
  '/home/*',
  '/agenda',
  '/agenda/*',
  '/especialidades',
  '/perfil',
] as const;

/** Whether a site path starts with a segment the app owns. */
export function isAppOwnedPath(path: string): boolean {
  const first = path.split('/')[1] ?? '';
  return (appPathSegments as readonly string[]).includes(first);
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
