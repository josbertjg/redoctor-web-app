/*
 * A small guard for the web's own endpoints that spend someone else's
 * quota (Google Places and the API's public search, M16): so many requests
 * per address and minute, counted in this server's memory, each endpoint's
 * count under its own key. On Vercel each instance counts on its own, so
 * it blunts a naive flood and nothing more; the real limits are Google's,
 * the key's restrictions (AGENTS.md §11) and the API's own.
 */

type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();

/** Forgets the windows that have passed, now and then. */
function prune(now: number) {
  if (windows.size < 1000) return;
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

export type RateLimit = { limit: number; windowMs: number };

/**
 * Whether one more request from `key` fits in its window; the window
 * opens on the first request and closes `windowMs` later.
 */
export function allowRequest(
  key: string,
  { limit, windowMs }: RateLimit,
  now = Date.now(),
): boolean {
  prune(now);
  const window = windows.get(key);
  if (!window || window.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (window.count >= limit) return false;
  window.count += 1;
  return true;
}

/** The address a request came from, as the platform forwards it. */
export function requestAddress(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();
  return first && first !== '' ? first : (headers.get('x-real-ip') ?? 'local');
}

/** The answer to one request too many: try again in a minute. */
export function rateLimited(): Response {
  return Response.json(
    { code: 'ERR_RATE_LIMITED' },
    {
      status: 429,
      headers: { 'Cache-Control': 'no-store', 'Retry-After': '60' },
    },
  );
}

/** For tests: start afresh. */
export function resetRateLimits(): void {
  windows.clear();
}
