import { useSyncExternalStore } from 'react';

import { detectInAppBrowser, type InAppBrowser } from '@/app/lib/platform';

// The browser does not change while the page is open: nothing to listen to.
const subscribe = () => () => undefined;

const read = () => detectInAppBrowser(navigator.userAgent);

const onServer = () => null;

/**
 * The app whose browser opened the page (Instagram, Facebook, an Android
 * web view), or null in a real browser, on the server and while hydrating.
 */
export function useInAppBrowser(): InAppBrowser | null {
  return useSyncExternalStore<InAppBrowser | null>(subscribe, read, onServer);
}
