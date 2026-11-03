// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  flowNeedsPersonalData,
  invitationOf,
  planSignUp,
  signUpPurposeOf,
  signUpRoleOf,
} from './sign-up';
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
  it('is the invitation or the booking, and only a same-origin one', () => {
    expect(flowNeedsPersonalData('/i/tok')).toBe(true);
    expect(flowNeedsPersonalData('/book/abc?office=o1')).toBe(true);
    expect(flowNeedsPersonalData('/a/abc')).toBe(false);
    expect(flowNeedsPersonalData('//evil.example/i/x')).toBe(false);
    expect(flowNeedsPersonalData(null)).toBe(false);
  });

  it('tells the two flows apart, for the words the sign-up uses', () => {
    expect(signUpPurposeOf('/i/tok?for=self')).toBe('claim');
    expect(signUpPurposeOf('/book/abc')).toBe('book');
    expect(signUpPurposeOf('/appointments')).toBeNull();
    expect(invitationOf('/book/abc')).toBeNull();
  });
});

describe('planSignUp', () => {
  it('asks a brand-new account who they are, unless an invitation says it', () => {
    expect(planSignUp(brandNew, null, null)).toEqual({ step: 'choose-role' });
    expect(planSignUp(brandNew, '/i/tok', null)).toEqual({
      step: 'patient',
      register: true,
      personalData: true,
    });
  });

  it('asks a registered patient for the personal data only when claiming or booking', () => {
    expect(planSignUp(registeredPatient, '/i/tok', null)).toEqual({
      step: 'patient',
      register: false,
      personalData: true,
    });
    expect(planSignUp(registeredPatient, '/book/abc', null)).toEqual({
      step: 'patient',
      register: false,
      personalData: true,
    });
    expect(planSignUp(registeredPatient, null, null)).toEqual({ step: 'done' });
  });

  it('asks a brand-new account booking for both parts, as a patient', () => {
    expect(planSignUp(brandNew, '/book/abc', null)).toEqual({
      step: 'patient',
      register: true,
      personalData: true,
    });
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
    expect(planSignUp(specialist, null, null)).toEqual({
      step: 'specialist-in-app',
    });
  });

  it('asks nothing of a complete account', () => {
    expect(planSignUp(account({}), '/i/tok', null)).toEqual({ step: 'done' });
    expect(planSignUp(account({}), null, null)).toEqual({ step: 'done' });
  });
});

describe('planSignUp, for a stranger', () => {
  it('asks who they are', () => {
    expect(planSignUp(null, null, null)).toEqual({ step: 'choose-role' });
  });

  it('offers the providers for the role chosen, with the way back', () => {
    expect(planSignUp(null, null, 'specialist')).toEqual({
      step: 'create',
      role: 'specialist',
      canGoBack: true,
    });
    expect(planSignUp(null, null, 'patient')).toEqual({
      step: 'create',
      role: 'patient',
      canGoBack: true,
    });
  });

  it('creates a patient account for an invitation or a booking, whatever the role', () => {
    expect(planSignUp(null, '/i/tok', null)).toEqual({
      step: 'create',
      role: 'patient',
      canGoBack: false,
    });
    expect(planSignUp(null, '/book/abc', 'specialist')).toEqual({
      step: 'create',
      role: 'patient',
      canGoBack: false,
    });
  });
});

describe('planSignUp, with a role chosen', () => {
  it('asks a brand-new account the form of the role it chose', () => {
    expect(planSignUp(brandNew, null, 'patient')).toEqual({
      step: 'patient',
      register: true,
      personalData: false,
    });
    expect(planSignUp(brandNew, null, 'specialist')).toEqual({
      step: 'specialist',
    });
  });

  it('lets an invitation decide, whatever the role', () => {
    expect(planSignUp(brandNew, '/i/tok', 'specialist')).toEqual({
      step: 'patient',
      register: true,
      personalData: true,
    });
  });

  it('is done for a registered account whatever the role', () => {
    expect(planSignUp(account({}), null, 'specialist')).toEqual({
      step: 'done',
    });
  });

  it('sends every open specialist sign-up to the app, and not a review', () => {
    const specialistAt = (status: string, registrationStatus: string) =>
      account({
        role: 'SPECIALIST',
        registrationStatus,
        profiles: {
          patient: { exists: false },
          specialist: { exists: true, status },
        },
      });
    expect(
      planSignUp(
        specialistAt(
          'PENDING_PHONE_VERIFICATION',
          'PENDING_PHONE_VERIFICATION',
        ),
        null,
        'specialist',
      ),
    ).toEqual({ step: 'specialist-in-app' });
    expect(
      planSignUp(
        specialistAt('PENDING_SPECIALTIES', 'PENDING_COMPLETE_SPECIALIST'),
        null,
        null,
      ),
    ).toEqual({ step: 'specialist-in-app' });
    expect(
      planSignUp(
        specialistAt('WAITING_ADMIN_REVIEW', 'WAITING_ADMIN_REVIEW'),
        null,
        null,
      ),
    ).toEqual({ step: 'done' });
  });
});

describe('signUpRoleOf', () => {
  it('reads the role the address names, and nothing else', () => {
    expect(signUpRoleOf('patient')).toBe('patient');
    expect(signUpRoleOf('specialist')).toBe('specialist');
    expect(signUpRoleOf('admin')).toBeNull();
    expect(signUpRoleOf('')).toBeNull();
    expect(signUpRoleOf(null)).toBeNull();
    expect(signUpRoleOf(undefined)).toBeNull();
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

describe('invitationOf, with a broken link', () => {
  it('names no invitation when the token is cut mid-escape', () => {
    expect(invitationOf('/i/%E0%A4%A')).toBeNull();
  });
});
