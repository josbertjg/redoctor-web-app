// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { destinationAfterSignIn } from './destination';
import { meResponseSchema, toAccount } from '../schemas/identity';

const account = (role: string, patient: boolean, specialist: boolean) =>
  toAccount(
    meResponseSchema.parse({
      id: 'u',
      role,
      registrationStatus: 'COMPLETED',
      profiles: {
        patient: { exists: patient, status: 'COMPLETED' },
        specialist: { exists: specialist, status: 'COMPLETED' },
      },
    }),
  );

describe('destinationAfterSignIn', () => {
  it('returns to a same-origin path first', () => {
    expect(
      destinationAfterSignIn(account('PATIENT', true, false), '/a/abc'),
    ).toBe('/a/abc');
    expect(
      destinationAfterSignIn(account('SPECIALIST', false, true), '/i/tok'),
    ).toBe('/i/tok');
  });

  it('never follows a path to another origin', () => {
    const patient = account('PATIENT', true, false);
    expect(destinationAfterSignIn(patient, 'https://evil.example')).toBe('/');
    expect(destinationAfterSignIn(patient, '//evil.example')).toBe('/');
  });

  it('keeps a patient on the landing and sends a specialist to their page', () => {
    expect(destinationAfterSignIn(account('PATIENT', true, false), null)).toBe(
      '/',
    );
    expect(
      destinationAfterSignIn(account('SPECIALIST', false, true), undefined),
    ).toBe('/panel');
    expect(destinationAfterSignIn(account('ADMIN', false, false), null)).toBe(
      '/panel',
    );
    // Both facets: the specialist one decides, as in the app.
    expect(
      destinationAfterSignIn(account('SPECIALIST', true, true), null),
    ).toBe('/panel');
  });
});

describe('an account with no sign-up behind it', () => {
  const brandNew = toAccount(
    meResponseSchema.parse({
      id: 'u',
      role: null,
      registrationStatus: 'PENDING_REGISTRATION',
      profiles: { patient: { exists: false }, specialist: { exists: false } },
    }),
  );

  it('goes to sign up first, keeping the way back', () => {
    expect(destinationAfterSignIn(brandNew, null)).toBe('/sign-up');
    expect(destinationAfterSignIn(brandNew, '/i/tok')).toBe(
      '/sign-up?redirect=%2Fi%2Ftok',
    );
    expect(destinationAfterSignIn(brandNew, '//evil.example')).toBe('/sign-up');
  });
});
