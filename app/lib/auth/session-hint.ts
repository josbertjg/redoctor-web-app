/*
 * A cookie that says "this browser probably has a session": `1`, nothing
 * else. Firebase keeps the real session in the browser's storage and answers
 * after the page has painted, so without this hint every page would first
 * paint «Entrar» for a signed-in person and then swap it (AGENTS.md §9: never
 * a flash of the wrong UI). With it, the server renders a placeholder where
 * the account goes until Firebase answers. It carries no name, no id and no
 * token, and it never decides anything by itself.
 */

export const sessionHintCookie = 'redoctor-session';

/*
 * A second hint, for the specialist's panel (owner, 2026-10-13): the session
 * in this browser is a specialist's, or an admin's. Such a person never sees
 * the landing — its search reads as an offer to book — so the server sends
 * `/` to `/panel` before painting anything. Also `1` and nothing else,
 * written once the API has said who the person is and forgotten with the
 * session. It only steers: the panel still checks the account itself.
 */
export const panelHintCookie = 'redoctor-panel';

const oneYearInSeconds = 60 * 60 * 24 * 365;

function write(name: string, value: string, maxAge: number): void {
  if (typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; secure' : '';
  document.cookie = `${name}=${value}; path=/; max-age=${String(maxAge)}; samesite=lax${secure}`;
}

export function rememberSessionHint(): void {
  write(sessionHintCookie, '1', oneYearInSeconds);
}

export function forgetSessionHint(): void {
  write(sessionHintCookie, '', 0);
}

export function rememberPanelHint(): void {
  write(panelHintCookie, '1', oneYearInSeconds);
}

export function forgetPanelHint(): void {
  write(panelHintCookie, '', 0);
}

/** Reads the hint from a `Cookie` header's value or `document.cookie`. */
export function hasSessionHint(
  cookieHeader: string | null | undefined,
): boolean {
  if (!cookieHeader) return false;
  return cookieHeader
    .split(';')
    .some((part) => part.trim() === `${sessionHintCookie}=1`);
}
