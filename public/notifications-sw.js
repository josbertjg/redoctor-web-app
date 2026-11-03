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
const OPENED_TYPE = 'redoctor:push-opened';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

/** A kind of the family `family`: the family itself, or a variant after it. */
function ofFamily(kind, family) {
  return kind === family || kind.startsWith(`${family}_`);
}

/**
 * The page a billing notice leads to, by family (the variants grow with the
 * catalog), or by its dotted event when the kind says nothing.
 */
function billingDestination(kind, event) {
  if (
    ofFamily(kind, 'BILLING_SUBSCRIPTION_NOT_ACTIVATED') ||
    kind.startsWith('BILLING_CANCELED') ||
    event === 'subscription.incomplete_expired' ||
    event === 'subscription.canceled'
  ) {
    return '/pay?view=plans';
  }
  if (
    ofFamily(kind, 'BILLING_COUPON_GIFTED') ||
    kind.startsWith('BILLING_DISCOUNT_') ||
    event.startsWith('discount.') ||
    event.startsWith('promotion_code.')
  ) {
    return '/panel/subscription/coupons';
  }
  if (
    ofFamily(kind, 'BILLING_ADJUSTMENT_ISSUED') ||
    event.startsWith('credit_note.')
  ) {
    return '/panel/subscription/invoices';
  }
  if (
    kind.startsWith('BILLING_BALANCE_') ||
    ofFamily(kind, 'BILLING_REFUND_RECORDED') ||
    event.startsWith('balance.') ||
    event.startsWith('refund.')
  ) {
    return '/panel/subscription/balance';
  }
  return '/panel/subscription';
}

/**
 * The page a notice leads to, with no knowledge of who is signed in — the
 * page itself asks for the session when it needs one. The same rule as
 * app/lib/notifications/destination.ts.
 */
function destinationOf(data) {
  if (typeof data.appointmentId === 'string' && data.appointmentId !== '') {
    return `/a/${encodeURIComponent(data.appointmentId)}`;
  }
  const kind = typeof data.kind === 'string' ? data.kind : '';
  const event =
    typeof data.billingEventType === 'string' ? data.billingEventType : '';
  if (kind.startsWith('BILLING_ADMIN_')) return '/';
  if (kind.startsWith('BILLING_') || event.includes('.')) {
    return billingDestination(kind, event);
  }
  if (kind === 'AGENDA_DAILY_SUMMARY') {
    return /^\d{4}-\d{2}-\d{2}$/.test(data.date || '')
      ? `/panel/agenda/${data.date}`
      : '/panel/agenda';
  }
  if (kind.startsWith('SPECIALTY_')) return '/panel/specialties';
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

/*
 * A tap opens the page the notice is about, and the notice is read
 * (REDOC-358): the worker has no session to tell the API, so it tells the
 * page — with a message to a tab already on it, or with `?notification=` in
 * the address of the one it opens or moves, which the page reads and drops.
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = stringsOf(event.notification.data);
  const url = new URL(destinationOf(data), self.location.origin);
  const id = data.notificationId || '';
  const marked = new URL(url.href);
  if (id) marked.searchParams.set('notification', id);

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      const same = windows.find((client) => client.url === url.href);
      if (same) {
        if (id) same.postMessage({ type: OPENED_TYPE, notificationId: id });
        return same.focus();
      }
      const open = windows.find((client) => 'navigate' in client);
      if (open) {
        await open.navigate(marked.href);
        return open.focus();
      }
      return self.clients.openWindow(marked.href);
    })(),
  );
});
