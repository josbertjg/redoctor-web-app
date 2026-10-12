// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { flowNeedsPersonalData, invitationOf, planSignUp } from './sign-up';
import { meResponseSchema, toAccount } from '../schemas/identity';

const account = (overrides: Record<string, unknown>) =>
  toAccount(
    meResponseSchema.parse({
      id: 'u',
      role: 'PATIENT',
      registrationStatus: 'COMPLETED',
      profiles: {
        patient: { exists: true, status: 'COMPLETED' },
        specialist: { exists: false },
      },
      ...overrides,
    }),
  );

const brandNew = account({
  role: null,
  registrationStatus: 'PENDING_REGISTRATION',
  profiles: { patient: { exists: false }, specialist: { exists: false } },
});

const registeredPatient = account({
  registrationStatus: 'PENDING_COMPLETE_PATIENT',
  profiles: {
    patient: { exists: true, status: 'PENDING_PERSONAL_DATA' },
    specialist: { exists: false },
  },
});

describe('flowNeedsPersonalData', () => {
  it('is the invitation, and only a same-origin one', () => {
    expect(flowNeedsPersonalData('/i/tok')).toBe(true);
    expect(flowNeedsPersonalData('/a/abc')).toBe(false);
    expect(flowNeedsPersonalData('//evil.example/i/x')).toBe(false);
    expect(flowNeedsPersonalData(null)).toBe(false);
  });
});

describe('planSignUp', () => {
  it('asks a brand-new account who they are, unless an invitation says it', () => {
    expect(planSignUp(brandNew, null)).toEqual({ step: 'choose-role' });
    expect(planSignUp(brandNew, '/i/tok')).toEqual({
      step: 'patient',
      register: true,
      personalData: true,
    });
  });

  it('asks a registered patient for the personal data only when claiming', () => {
    expect(planSignUp(registeredPatient, '/i/tok')).toEqual({
      step: 'patient',
      register: false,
      personalData: true,
    });
    expect(planSignUp(registeredPatient, null)).toEqual({ step: 'done' });
  });

  it('sends an open specialist sign-up to the app', () => {
    const specialist = account({
      role: 'SPECIALIST',
      registrationStatus: 'PENDING_KYC',
      profiles: {
        patient: { exists: false },
        specialist: { exists: true, status: 'PENDING_KYC' },
      },
    });
    expect(planSignUp(specialist, null)).toEqual({ step: 'specialist-in-app' });
  });

  it('asks nothing of a complete account', () => {
    expect(planSignUp(account({}), '/i/tok')).toEqual({ step: 'done' });
    expect(planSignUp(account({}), null)).toEqual({ step: 'done' });
  });
});

describe('invitationOf', () => {
  it('names the invitation a sign-up comes from and whether it is theirs', () => {
    expect(invitationOf('/i/tok-1?for=self')).toEqual({
      token: 'tok-1',
      forSelf: true,
    });
    expect(invitationOf('/i/tok-1?for=dependent')).toEqual({
      token: 'tok-1',
      forSelf: false,
    });
    expect(invitationOf('/i/tok-1')).toEqual({
      token: 'tok-1',
      forSelf: false,
    });
  });

  it('is nobody’s for any other path', () => {
    expect(invitationOf('/a/abc')).toBeNull();
    expect(invitationOf('/i/tok/extra')).toBeNull();
    expect(invitationOf('//evil.example/i/tok')).toBeNull();
    expect(invitationOf(null)).toBeNull();
  });
});
