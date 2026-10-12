import 'client-only';

import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
  onIdTokenChanged,
  signInWithPopup,
  signOut,
  type Auth,
  type AuthProvider as FirebaseAuthProvider,
  type User,
} from 'firebase/auth';

import { publicEnv } from '../public-env';

import type { AuthProvider } from '../auth/last-provider';

/*
 * Firebase Auth in the browser, the same project and the same accounts as
 * the app (AGENTS.md §1, §2): Google and Apple, nothing else. Signing in
 * opens the provider's window (`signInWithPopup`): it works on Safari and
 * iOS, where the redirect flow needs the auth domain to be ours (the
 * `/__/auth/*` proxy that comes with the domain cutover, §6). The session
 * lives in Firebase's own storage; the web keeps no token of its own.
 *
 * This module is loaded on demand (`import()`), so the landing's JS does
 * not carry it.
 */

export type SessionUser = {
  /** Firebase's uid: the only id analytics and error reports ever see. */
  id: string;
  email: string | null;
  name: string | null;
  photo: string | null;
  /** The provider behind the account, when it is one of ours. */
  provider: AuthProvider | null;
  /** A fresh ID token for the API's bearer. */
  getToken: () => Promise<string>;
};

/**
 * Why a sign-in attempt failed, as the copy names it
 * (`apiErrors.firebaseAuthErrors.*`, the app's keys).
 */
export type AuthErrorKey =
  | 'popupBlocked'
  | 'accountExistsWithDifferentCredential'
  | 'network'
  | 'operationNotAllowed'
  | 'userDisabled'
  | 'tooManyRequests'
  | 'unknownAuth';

export type SignInOutcome =
  | { status: 'signed-in'; user: SessionUser }
  /** The person closed the provider's window: not an error, nothing to say. */
  | { status: 'cancelled' }
  | { status: 'failed'; reason: AuthErrorKey };

let auth: Auth | undefined;

function firebaseAuth(): Auth {
  if (auth) return auth;
  const app =
    getApps().length > 0 ? getApp() : initializeApp(publicEnv.firebase);
  auth = getAuth(app);
  // The provider's own pages (account chooser, consent) in Spanish.
  auth.languageCode = 'es';
  return auth;
}

const providerIds: Record<AuthProvider, string> = {
  google: 'google.com',
  apple: 'apple.com',
};

function providerOf(user: User): AuthProvider | null {
  const ids = new Set(user.providerData.map((info) => info.providerId));
  if (ids.has(providerIds.google)) return 'google';
  if (ids.has(providerIds.apple)) return 'apple';
  return null;
}

export function toSessionUser(user: User): SessionUser {
  return {
    id: user.uid,
    email: user.email,
    name: user.displayName,
    photo: user.photoURL,
    provider: providerOf(user),
    getToken: () => user.getIdToken(),
  };
}

function providerFor(provider: AuthProvider): FirebaseAuthProvider {
  if (provider === 'google') {
    const google = new GoogleAuthProvider();
    // Always the account chooser: on a shared computer, and for whoever has
    // two Google accounts, the right one is a deliberate pick (§1).
    google.setCustomParameters({ prompt: 'select_account' });
    return google;
  }
  const apple = new OAuthProvider(providerIds.apple);
  apple.addScope('email');
  apple.addScope('name');
  apple.setCustomParameters({ locale: 'es_ES' });
  return apple;
}

const cancelledCodes = new Set([
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/user-cancelled',
]);

const reasonsByCode: Record<string, AuthErrorKey> = {
  'auth/popup-blocked': 'popupBlocked',
  'auth/account-exists-with-different-credential':
    'accountExistsWithDifferentCredential',
  'auth/network-request-failed': 'network',
  'auth/operation-not-allowed': 'operationNotAllowed',
  'auth/user-disabled': 'userDisabled',
  'auth/too-many-requests': 'tooManyRequests',
};

/** Firebase's errors carry `code: 'auth/...'`; nothing else is assumed. */
function codeOf(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const { code } = error as { code?: unknown };
  return typeof code === 'string' ? code : undefined;
}

export function outcomeOfError(error: unknown): SignInOutcome {
  const code = codeOf(error);
  if (code !== undefined && cancelledCodes.has(code)) {
    return { status: 'cancelled' };
  }
  return {
    status: 'failed',
    reason:
      (code === undefined ? undefined : reasonsByCode[code]) ?? 'unknownAuth',
  };
}

/**
 * Follows the session: the current person at once, then every sign-in,
 * sign-out and token refresh. Returns the function that stops following.
 */
export function watchSession(
  listener: (user: SessionUser | null) => void,
): () => void {
  return onIdTokenChanged(firebaseAuth(), (user) => {
    listener(user ? toSessionUser(user) : null);
  });
}

export async function signInWith(
  provider: AuthProvider,
): Promise<SignInOutcome> {
  try {
    const credential = await signInWithPopup(
      firebaseAuth(),
      providerFor(provider),
    );
    return { status: 'signed-in', user: toSessionUser(credential.user) };
  } catch (error) {
    return outcomeOfError(error);
  }
}

export async function signOutUser(): Promise<void> {
  await signOut(firebaseAuth());
}
