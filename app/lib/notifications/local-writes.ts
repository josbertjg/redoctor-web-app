/*
 * When this tab last wrote to the API. The API names the device a change
 * came from (`originDeviceId`, REDOC-358) so that device ignores its own
 * echo; on the web one device is every tab of the browser, and only the
 * tab that wrote has read its result again. Another tab of the same
 * browser still has to: it tells itself apart by not having written just
 * now. Kept in memory: each tab its own.
 */

let lastWriteAt = Number.NEGATIVE_INFINITY;

/** How long after a write its echoes count as this tab's own. */
export const OWN_ECHO_WINDOW_MS = 15_000;

export function markLocalWrite(now: number = Date.now()): void {
  lastWriteAt = now;
}

export function wroteRecently(now: number = Date.now()): boolean {
  return now - lastWriteAt <= OWN_ECHO_WINDOW_MS;
}

/** For the tests: as if nothing had been written. */
export function resetLocalWrites(): void {
  lastWriteAt = Number.NEGATIVE_INFINITY;
}
