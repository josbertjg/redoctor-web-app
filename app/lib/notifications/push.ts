/*
 * What this browser remembers about the push (the app's
 * DeviceIdentityService, its registration record and its permission
 * storage), in localStorage: a convenience of this device, never read by
 * anyone else. Every read tolerates a storage that refuses (private mode,
 * full): the push is the one thing that then does not work.
 */

/** How the API knows a browser among the person's devices. */
export const WEB_PLATFORM = 'WEB';

/** The app's rhythm: once every twelve hours the device says it is still in use. */
export const HEARTBEAT_INTERVAL_MS = 12 * 60 * 60 * 1000;

const deviceIdKey = 'redoctor-device-id';
const registrationKey = 'redoctor-push-registration';
const heartbeatKey = 'redoctor-push-heartbeat';
const declinedKey = 'redoctor-push-declined';

const deviceIdShape = /^[A-Za-z0-9._:-]{8,128}$/;

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Storage refused: the push degrades, nothing else does.
  }
}

/**
 * A stable identity of this browser, not of the session, made once and
 * never forgotten on sign-out: it is what lets the API see another person
 * signing in on the same device and revoke the one before. `null` when the
 * storage refuses, and the API then keys the device by its token.
 */
export function deviceId(): string | null {
  const stored = read(deviceIdKey);
  if (stored !== null && deviceIdShape.test(stored)) return stored;
  try {
    const generated = crypto.randomUUID();
    write(deviceIdKey, generated);
    return generated;
  } catch {
    return null;
  }
}

/** With whom and with which token this browser was registered last. */
export type PushRegistration = { userId: string; token: string };

export function loadRegistration(): PushRegistration | null {
  const raw = read(registrationKey);
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { userId, token } = parsed as Record<string, unknown>;
    if (typeof userId !== 'string' || typeof token !== 'string') return null;
    return userId !== '' && token !== '' ? { userId, token } : null;
  } catch {
    return null;
  }
}

export function saveRegistration(registration: PushRegistration): void {
  write(registrationKey, JSON.stringify(registration));
}

export function forgetRegistration(): void {
  write(registrationKey, null);
}

/** Whether twelve hours went by since the last heartbeat (or there was none). */
export function heartbeatIsDue(now: number): boolean {
  const last = Number(read(heartbeatKey));
  if (!Number.isFinite(last) || last <= 0) return true;
  return now - last >= HEARTBEAT_INTERVAL_MS;
}

export function markHeartbeat(now: number): void {
  write(heartbeatKey, String(now));
}

/**
 * The person said «Ahora no» to the invitation while the browser could
 * still ask: remembered so the next visit does not repeat it. Cleared as
 * soon as the permission is given by any way.
 */
export function wasDeclined(): boolean {
  return read(declinedKey) === '1';
}

export function markDeclined(): void {
  write(declinedKey, '1');
}

export function clearDeclined(): void {
  write(declinedKey, null);
}

/** The browser's answer so far, as the Notification API tells it. */
export type BrowserPermission = 'default' | 'granted' | 'denied';

export function readPermission(): BrowserPermission {
  if (typeof Notification === 'undefined') return 'denied';
  return Notification.permission;
}

/**
 * A name the person recognizes in the list of their devices («Chrome ·
 * macOS»), from the user agent: the browser and the system, never the
 * version — nobody knows their browser by it.
 */
export function describeBrowser(userAgent: string): string {
  const browser =
    browsers.find(([mark]) => userAgent.includes(mark))?.[1] ?? 'Navegador';
  const system = systems.find(([mark]) => userAgent.includes(mark))?.[1];
  return system === undefined ? browser : `${browser} · ${system}`;
}

/** In order: Edge and Opera say «Chrome» too, and every WebKit browser says «Safari». */
const browsers: readonly [mark: string, name: string][] = [
  ['Edg/', 'Edge'],
  ['OPR/', 'Opera'],
  ['SamsungBrowser/', 'Samsung Internet'],
  ['Chrome/', 'Chrome'],
  ['Firefox/', 'Firefox'],
  ['Safari/', 'Safari'],
];

/** In order: an iPhone says «Mac OS X» too, and Android says «Linux». */
const systems: readonly [mark: string, name: string][] = [
  ['iPhone', 'iOS'],
  ['iPad', 'iOS'],
  ['iPod', 'iOS'],
  ['Android', 'Android'],
  ['Mac OS X', 'macOS'],
  ['Windows', 'Windows'],
  ['CrOS', 'ChromeOS'],
  ['Linux', 'Linux'],
];
