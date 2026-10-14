/*
 * The app's «Búsquedas recientes»: the last five things a person looked
 * for — a text, a specialty of the catalog, a specialist —, offered when
 * the search box is empty. They live in the browser alone (localStorage, a
 * convenience of this device), the latest first; one looked for again
 * moves to the top instead of repeating.
 */

export type RecentSearch =
  | { kind: 'text'; label: string }
  | { kind: 'specialty'; id: string; label: string }
  | { kind: 'specialist'; id: string; label: string };

export const recentSearchesLimit = 5;

const storageKey = 'redoctor-recent-searches';

/** What makes two entries the same search. */
function keyOf(entry: RecentSearch): string {
  return entry.kind === 'text'
    ? `text:${entry.label.toLocaleLowerCase('es')}`
    : `${entry.kind}:${entry.id}`;
}

export function sameSearch(a: RecentSearch, b: RecentSearch): boolean {
  return keyOf(a) === keyOf(b);
}

/** The list with an entry on top, once, and never more than the limit. */
export function rememberSearch(
  list: readonly RecentSearch[],
  entry: RecentSearch,
): RecentSearch[] {
  return [entry, ...list.filter((other) => !sameSearch(other, entry))].slice(
    0,
    recentSearchesLimit,
  );
}

export function forgetSearch(
  list: readonly RecentSearch[],
  entry: RecentSearch,
): RecentSearch[] {
  return list.filter((other) => !sameSearch(other, entry));
}

function isRecentSearch(value: unknown): value is RecentSearch {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Record<string, unknown>;
  if (typeof entry.label !== 'string' || entry.label === '') return false;
  if (entry.kind === 'text') return true;
  return (
    (entry.kind === 'specialty' || entry.kind === 'specialist') &&
    typeof entry.id === 'string' &&
    entry.id !== ''
  );
}

/** What this browser remembers; nothing when storage is off or holds nonsense. */
export function loadRecentSearches(): RecentSearch[] {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRecentSearch).slice(0, recentSearchesLimit);
  } catch {
    return [];
  }
}

export function saveRecentSearches(list: readonly RecentSearch[]): void {
  try {
    if (list.length === 0) window.localStorage.removeItem(storageKey);
    else window.localStorage.setItem(storageKey, JSON.stringify(list));
  } catch {
    // Storage refused (private mode, full): the list is a convenience.
  }
}
