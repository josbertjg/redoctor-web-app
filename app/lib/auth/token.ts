/*
 * Where the authenticated API calls get their bearer (AGENTS.md §9): a
 * function that asks Firebase for a fresh ID token, set by the session
 * provider while someone is signed in. The token itself is never stored
 * here, nor anywhere else: Firebase holds it and refreshes it.
 */

export type TokenSource = () => Promise<string>;

let source: TokenSource | null = null;

export function setTokenSource(next: TokenSource | null): void {
  source = next;
}

/** A fresh ID token, or `null` without a session. */
export function getSessionToken(): Promise<string | null> {
  return source ? source() : Promise.resolve(null);
}
