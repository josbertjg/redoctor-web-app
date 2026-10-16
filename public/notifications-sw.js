/*
 * The service worker of the push (the notifications' second phase). It
 * receives what Firebase Cloud Messaging delivers to this browser and shows
 * it as the browser's notification only while no tab of Redoctor is in
 * view: with one in view, the page shows the notice itself through its live
 * channel, and the worker only tells the tab, in case that channel is down.
 * A tap on the notification opens the page the notice is about, by the ids
 * it carries (the same rule as app/lib/notifications/destination.ts).
 *
 * Plain JavaScript on purpose: it is served as a static file from public/
 * and runs without the page's bundle, and it loads no script from elsewhere.
 * Registered by app/lib/firebase/messaging.ts.
 */

const ICON = '/brand/icon-192.png';
const MESSAGE_TYPE = 'redoctor:push';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

/** The page a notice leads to, with no knowledge of who is signed in. */
function destinationOf(data) {
  if (typeof data.appointmentId === 'string' && data.appointmentId !== '') {
    return `/a/${encodeURIComponent(data.appointmentId)}`;
  }
  const kind = typeof data.kind === 'string' ? data.kind : '';
  const billingType = kind.startsWith('BILLING_')
    ? kind
    : typeof data.billingEventType === 'string'
      ? data.billingEventType
      : kind;
  if (billingType.startsWith('BILLING_ADMIN_')) return '/';
  if (billingType.startsWith('BILLING_')) return '/panel/subscription';
  if (kind.startsWith('PROFILE_')) return '/panel/profile';
  return '/';
}

function readPayload(event) {
  try {
    return event.data ? event.data.json() : null;
  } catch {
    return null;
  }
}

/** The payload's `data`, every value as a string. */
function stringsOf(data) {
  const strings = {};
  if (typeof data !== 'object' || data === null) return strings;
  for (const [key, value] of Object.entries(data)) {
    if (value !== null && value !== undefined) strings[key] = String(value);
  }
  return strings;
}

self.addEventListener('push', (event) => {
  const payload = readPayload(event);
  if (payload === null || typeof payload !== 'object') return;
  const notification = payload.notification || {};
  const data = stringsOf(payload.data);
  const title = notification.title || data.title;
  const body = notification.body || data.body || '';
  if (!title) return;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      for (const client of windows) {
        client.postMessage({ type: MESSAGE_TYPE, data });
      }
      if (windows.some((client) => client.visibilityState === 'visible')) {
        return;
      }
      await self.registration.showNotification(title, {
        body,
        icon: ICON,
        lang: 'es',
        data,
        tag: data.appointmentId
          ? `appointment-${data.appointmentId}`
          : undefined,
      });
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = stringsOf(event.notification.data);
  const url = new URL(destinationOf(data), self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      const same = windows.find((client) => client.url === url);
      if (same) return same.focus();
      const open = windows.find((client) => 'navigate' in client);
      if (open) {
        await open.navigate(url);
        return open.focus();
      }
      return self.clients.openWindow(url);
    })(),
  );
});
