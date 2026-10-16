import 'client-only';

import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  deleteToken,
  getMessaging,
  getToken,
  isSupported,
  type Messaging,
} from 'firebase/messaging';

import { publicEnv } from '../public-env';

/*
 * Firebase Cloud Messaging in the browser, the same project as the app
 * (AGENTS.md §2): the web push of the notifications. Firebase subscribes
 * this browser to push through our own service worker and trades the
 * subscription for the device token the API registers
 * (app/lib/notifications/push.ts). The worker is ours and not Firebase's:
 * it shows a notice as the browser's notification only while no tab of the
 * web is in view, and loads no script from elsewhere.
 *
 * Loaded on demand (`import()`), only with a signed-in person and the VAPID
 * key set: the landing's JavaScript does not carry it.
 *
 * Firebase 13 deprecates the registration token in favour of an identity by
 * Installation ID (`register`, `onRegistered`), which the backend's send
 * API can target too. The API's contract and the app address devices by
 * token (`POST /notifications/device-tokens`), so the token stays until
 * Heyscar takes FIDs: the two calls below are the deprecated ones, on
 * purpose (AGENTS.md §13, Decided 2026-10-14, «Notifications»).
 */

/** Served from the root (public/), so its scope is the whole site. */
export const pushServiceWorkerPath = '/notifications-sw.js';

let messaging: Messaging | undefined;

function firebaseMessaging(): Messaging {
  if (messaging) return messaging;
  const app =
    getApps().length > 0 ? getApp() : initializeApp(publicEnv.firebase);
  messaging = getMessaging(app);
  return messaging;
}

/**
 * Whether this browser can receive web push at all: service workers,
 * the Push API and the Notification API. Safari on iOS has them only in a
 * web app added to the home screen.
 */
export async function isPushSupported(): Promise<boolean> {
  try {
    return (
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      (await isSupported())
    );
  } catch {
    return false;
  }
}

/**
 * The device token Cloud Messaging knows this browser by, with the push
 * subscription made through our worker. Needs the permission granted; the
 * token is kept by Firebase and renewed by it when it asks for one again.
 */
export async function getPushToken(vapidKey: string): Promise<string> {
  const registration = await navigator.serviceWorker.register(
    pushServiceWorkerPath,
  );
  // The API addresses devices by token (see the module's note).
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  return getToken(firebaseMessaging(), {
    vapidKey,
    serviceWorkerRegistration: registration,
  });
}

/**
 * Drops the token, so no push reaches this browser until someone signs in
 * and allows it again: what tells one person from the next on a shared
 * computer, even when the API could not be told.
 */
export async function deletePushToken(): Promise<void> {
  // The token's end, as its start (see the module's note).
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  await deleteToken(firebaseMessaging());
}
