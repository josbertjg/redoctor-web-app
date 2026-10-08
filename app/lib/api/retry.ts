import type { HttpMethod } from './types';

/*
 * Which failures the client retries by itself (AGENTS.md §5), mirror of the
 * app's `RetryPolicy` (config/api/retry_policy.dart).
 *
 * Reads and updates (GET, PUT, PATCH) are retried on any transient failure:
 * an update only sets values, so sending it twice leaves the same state.
 * Creates and deletes (POST, DELETE) are not: if they went out and the answer
 * was lost, nobody knows whether they landed. They are retried only when the
 * request certainly never reached the server, or when declared idempotent.
 */

export const DEFAULT_MAX_RETRIES = 2;

const replayableMethods: ReadonlySet<HttpMethod> = new Set([
  'GET',
  'PUT',
  'PATCH',
]);

/** Sending it twice leaves the server as sending it once. */
export function isReplayable(method: HttpMethod, idempotent = false): boolean {
  return idempotent || replayableMethods.has(method);
}

/** A 4xx would come back the same; only 408, 429 and 5xx may change. */
export function isTransientStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

/*
 * Node (server-side fetch, undici) tells why a connection failed: these codes
 * happen before a single byte is sent. The browser hides the reason, so there
 * only being offline proves the request never left. Node also has a
 * `navigator`, without `onLine`: only an explicit `false` counts.
 */
const connectFailureCodes = new Set([
  'ECONNREFUSED',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ENETUNREACH',
  'EHOSTUNREACH',
  'UND_ERR_CONNECT_TIMEOUT',
]);

export function neverReachedServer(error: unknown): boolean {
  // Typed as unknown on purpose: the DOM types promise a boolean, Node has none.
  const onLine: unknown =
    typeof navigator === 'undefined' ? undefined : navigator.onLine;
  if (onLine === false) return true;
  const cause =
    error instanceof Error && typeof error.cause === 'object'
      ? (error.cause as { code?: unknown } | null)
      : null;
  return typeof cause?.code === 'string' && connectFailureCodes.has(cause.code);
}

/** Exponential backoff with jitter: ~300 ms, then ~900 ms. */
export function backoffDelay(attempt: number, random = Math.random): number {
  return 300 * 3 ** attempt + Math.round(random() * 100);
}

/** Honors a 429's Retry-After (seconds), capped so the person never waits long. */
export function retryAfterDelay(header: string | null): number | undefined {
  if (header === null) return undefined;
  const seconds = Number(header);
  if (!Number.isFinite(seconds) || seconds < 0) return undefined;
  return Math.min(seconds * 1000, 5000);
}
