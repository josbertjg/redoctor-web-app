/*
 * The search currently in force — what the person last looked for, as a
 * text or a specialty of the catalog —, kept in this browser so every bar
 * on subsequent pages shows the active search until they change or clear it
 * (localStorage, a convenience of this device, never sent anywhere).
 */

export type ActiveSearch =
  | { kind: 'text'; text: string }
  | { kind: 'specialty'; id: string; name: string };

const storageKey = 'redoctor-active-search';

function isActiveSearch(value: unknown): value is ActiveSearch {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Record<string, unknown>;
  if (entry.kind === 'text') {
    return typeof entry.text === 'string' && entry.text.trim() !== '';
  }
  return (
    entry.kind === 'specialty' &&
    typeof entry.id === 'string' &&
    entry.id !== '' &&
    typeof entry.name === 'string' &&
    entry.name.trim() !== ''
  );
}

export function loadActiveSearch(): ActiveSearch | null {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    return isActiveSearch(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveActiveSearch(entry: ActiveSearch | null): void {
  try {
    if (entry === null) window.localStorage.removeItem(storageKey);
    else window.localStorage.setItem(storageKey, JSON.stringify(entry));
  } catch {
    // Storage refused (private mode, full): the active search is a convenience.
  }
}
