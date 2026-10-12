import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { User } from 'firebase/auth';

const firebaseAuth = vi.hoisted(() => ({
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  onIdTokenChanged: vi.fn(),
  setCustomParameters: vi.fn(),
  addScope: vi.fn(),
}));

vi.mock('firebase/app', () => ({
  getApps: () => [],
  getApp: () => ({}),
  initializeApp: () => ({}),
}));

vi.mock('firebase/auth', () => ({
  getAuth: () => ({ languageCode: '' }),
  onIdTokenChanged: firebaseAuth.onIdTokenChanged,
  signInWithPopup: firebaseAuth.signInWithPopup,
  signOut: firebaseAuth.signOut,
  GoogleAuthProvider: class {
    providerId = 'google.com';
    setCustomParameters = firebaseAuth.setCustomParameters;
  },
  OAuthProvider: class {
    constructor(public providerId: string) {}
    addScope = firebaseAuth.addScope;
    setCustomParameters = firebaseAuth.setCustomParameters;
  },
}));

const { outcomeOfError, signInWith, toSessionUser, watchSession } =
  await import('./client');

const user = {
  uid: 'uid-1',
  email: 'ana@example.com',
  displayName: 'Ana Pérez',
  photoURL: 'https://lh3.googleusercontent.com/a/photo',
  providerData: [{ providerId: 'google.com' }],
  getIdToken: () => Promise.resolve('id-token'),
} as unknown as User;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('toSessionUser', () => {
  it('keeps the id, the name, the photo and the provider', async () => {
    const session = toSessionUser(user);

    expect(session).toMatchObject({
      id: 'uid-1',
      email: 'ana@example.com',
      name: 'Ana Pérez',
      provider: 'google',
    });
    await expect(session.getToken()).resolves.toBe('id-token');
  });

  it('names Apple and tells an unknown provider', () => {
    expect(
      toSessionUser({
        ...user,
        providerData: [{ providerId: 'apple.com' }],
      } as unknown as User).provider,
    ).toBe('apple');
    expect(toSessionUser({ ...user, providerData: [] }).provider).toBeNull();
  });
});

describe('signInWith', () => {
  it('signs in with the provider asked, in Spanish, with the account chooser', async () => {
    firebaseAuth.signInWithPopup.mockResolvedValue({ user });

    const outcome = await signInWith('google');

    expect(outcome).toMatchObject({
      status: 'signed-in',
      user: { id: 'uid-1' },
    });
    expect(firebaseAuth.signInWithPopup).toHaveBeenCalledWith(
      expect.objectContaining({ languageCode: 'es' }),
      expect.objectContaining({ providerId: 'google.com' }),
    );
    expect(firebaseAuth.setCustomParameters).toHaveBeenCalledWith({
      prompt: 'select_account',
    });
  });

  it('asks Apple for the email and the name', async () => {
    firebaseAuth.signInWithPopup.mockResolvedValue({ user });

    await signInWith('apple');

    expect(firebaseAuth.signInWithPopup).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ providerId: 'apple.com' }),
    );
    expect(firebaseAuth.addScope).toHaveBeenCalledWith('email');
    expect(firebaseAuth.addScope).toHaveBeenCalledWith('name');
  });

  it('treats a closed window as a cancellation, not an error', async () => {
    firebaseAuth.signInWithPopup.mockRejectedValue({
      code: 'auth/popup-closed-by-user',
    });

    await expect(signInWith('google')).resolves.toEqual({
      status: 'cancelled',
    });
  });

  it('names the failures the person can meet', () => {
    expect(outcomeOfError({ code: 'auth/popup-blocked' })).toEqual({
      status: 'failed',
      reason: 'popupBlocked',
    });
    expect(
      outcomeOfError({ code: 'auth/account-exists-with-different-credential' }),
    ).toEqual({
      status: 'failed',
      reason: 'accountExistsWithDifferentCredential',
    });
    expect(outcomeOfError({ code: 'auth/network-request-failed' })).toEqual({
      status: 'failed',
      reason: 'network',
    });
    expect(outcomeOfError({ code: 'auth/operation-not-allowed' })).toEqual({
      status: 'failed',
      reason: 'operationNotAllowed',
    });
    expect(outcomeOfError(new Error('boom'))).toEqual({
      status: 'failed',
      reason: 'unknownAuth',
    });
    expect(outcomeOfError(undefined)).toEqual({
      status: 'failed',
      reason: 'unknownAuth',
    });
  });
});

describe('watchSession', () => {
  it('hands the listener a session user, or null', () => {
    const listener = vi.fn();
    firebaseAuth.onIdTokenChanged.mockImplementation(
      (_auth: unknown, next: (user: User | null) => void) => {
        next(user);
        next(null);
        return () => undefined;
      },
    );

    watchSession(listener);

    expect(listener).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ id: 'uid-1', provider: 'google' }),
    );
    expect(listener).toHaveBeenNthCalledWith(2, null);
  });
});
