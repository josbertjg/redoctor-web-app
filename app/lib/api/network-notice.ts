/*
 * Connectivity problems are announced once, globally, never per widget
 * (AGENTS.md §5). This decides when the one neutral notice may show again.
 */

export const NETWORK_NOTICE_INTERVAL_MS = 10_000;

export function createNetworkNoticeThrottle(
  intervalMs = NETWORK_NOTICE_INTERVAL_MS,
  now: () => number = Date.now,
) {
  let lastShownAt = Number.NEGATIVE_INFINITY;

  /** True when the notice may show now (and records that it did). */
  return function shouldShow(): boolean {
    const current = now();
    if (current - lastShownAt < intervalMs) return false;
    lastShownAt = current;
    return true;
  };
}
