/*
 * Which provider this browser last signed in with. It goes first on the
 * sign-in page and wears the «Última vez» chip (the app does the same): it is
 * what keeps someone with a Google account from tapping Apple out of habit
 * and ending up in a new, empty account. Kept in localStorage: a brand name,
 * nothing personal.
 */

export const authProviders = ['google', 'apple'] as const;

export type AuthProvider = (typeof authProviders)[number];

const storageKey = 'redoctor-last-provider';

function isProvider(value: unknown): value is AuthProvider {
  return value === 'google' || value === 'apple';
}

export function readLastProvider(): AuthProvider | null {
  try {
    const value = window.localStorage.getItem(storageKey);
    return isProvider(value) ? value : null;
  } catch {
    // Storage can be blocked (private mode, a strict policy): no memory, then.
    return null;
  }
}

export function rememberLastProvider(provider: AuthProvider): void {
  try {
    window.localStorage.setItem(storageKey, provider);
  } catch {
    // Same as above.
  }
}

/**
 * The order of the buttons: the last-used provider first; without a memory,
 * Apple first on Apple devices, as Apple asks, and Google elsewhere.
 */
export function orderProviders(
  last: AuthProvider | null,
  onAppleDevice: boolean,
): readonly AuthProvider[] {
  const first = last ?? (onAppleDevice ? 'apple' : 'google');
  return first === 'apple' ? ['apple', 'google'] : ['google', 'apple'];
}
