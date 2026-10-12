// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  canUseSpecialistArea,
  hasNoFacet,
  isApplePrivateRelayEmail,
  meResponseSchema,
  mustFinishPatientSignup,
  needsSignUp,
  patientCompletionBodySchema,
  patientRegistrationBodySchema,
  specialistMustFinishInApp,
  toAccount,
  toFacetStatus,
  toRegistrationStatus,
} from './identity';

const base = {
  id: 'user-1',
  email: 'ana@example.com',
  displayName: 'Ana Pérez',
  photoUrl: 'https://lh3.googleusercontent.com/a/photo',
  role: 'PATIENT',
  status: 'ACTIVE',
  registrationStatus: 'COMPLETED',
  profiles: {
    patient: { exists: true, id: 'patient-1', status: 'COMPLETED' },
    specialist: { exists: false },
  },
};

describe('meResponseSchema', () => {
  it('keeps what the web needs and drops the rest', () => {
    const parsed = meResponseSchema.parse({
      ...base,
      acceptedTerms: true,
      profile: { documentNumber: 'V-12345678', phone: '+584141234567' },
    });

    expect(parsed).not.toHaveProperty('profile');
    expect(parsed).not.toHaveProperty('acceptedTerms');
    expect(parsed.profiles?.patient?.id).toBe('patient-1');
  });

  it('reads a missing facet as one that does not exist', () => {
    const parsed = meResponseSchema.parse({ ...base, profiles: null });

    const account = toAccount(parsed);
    expect(account.patient.exists).toBe(false);
    expect(account.specialist.exists).toBe(false);
    expect(hasNoFacet(account)).toBe(true);
  });
});

describe('toFacetStatus', () => {
  it('names the statuses the API documents, however they are spelled', () => {
    expect(toFacetStatus('COMPLETED')).toBe('completed');
    expect(toFacetStatus('PENDING_KYC_DATA_VERIFICATION')).toBe(
      'pendingKycDataVerification',
    );
    expect(toFacetStatus('pendingPersonalData')).toBe('pendingPersonalData');
    expect(toFacetStatus('waiting-admin-review')).toBe('waitingAdminReview');
  });

  it('keeps an unknown status inert', () => {
    expect(toFacetStatus('SOMETHING_NEW')).toBe('unknown');
    expect(toFacetStatus(null)).toBe('unknown');
  });
});

describe('toAccount', () => {
  it('maps a complete patient', () => {
    const account = toAccount(meResponseSchema.parse(base));

    expect(account).toMatchObject({
      id: 'user-1',
      email: 'ana@example.com',
      name: 'Ana Pérez',
      role: 'patient',
      patient: { exists: true, status: 'completed', isComplete: true },
      specialist: { exists: false, status: null },
    });
    expect(canUseSpecialistArea(account)).toBe(false);
  });

  it('tells an open sign-up from a complete one', () => {
    const account = toAccount(
      meResponseSchema.parse({
        ...base,
        role: 'SPECIALIST',
        profiles: {
          patient: { exists: false },
          specialist: {
            exists: true,
            id: 'sp-1',
            status: 'PENDING_KYC',
            nextStep: '/identity/kyc',
          },
        },
      }),
    );

    expect(account.specialist).toMatchObject({
      status: 'pendingKyc',
      nextStep: '/identity/kyc',
      isComplete: false,
      isIncomplete: true,
    });
    expect(canUseSpecialistArea(account)).toBe(true);
  });

  it('treats an unknown status as neither complete nor pending', () => {
    const account = toAccount(
      meResponseSchema.parse({
        ...base,
        profiles: {
          patient: { exists: true, id: 'p', status: 'BRAND_NEW_STATE' },
          specialist: null,
        },
      }),
    );

    expect(account.patient.status).toBe('unknown');
    expect(account.patient.isComplete).toBe(false);
    expect(account.patient.isIncomplete).toBe(false);
  });

  it('lets an admin into the specialist area and blanks empty strings', () => {
    const account = toAccount(
      meResponseSchema.parse({
        ...base,
        role: 'SUPER_ADMIN',
        displayName: '  ',
        photoUrl: '',
      }),
    );

    expect(account.role).toBe('admin');
    expect(account.name).toBeNull();
    expect(account.photo).toBeNull();
    expect(canUseSpecialistArea(account)).toBe(true);
  });
});

describe('isApplePrivateRelayEmail', () => {
  it('recognizes the addresses Apple makes up', () => {
    expect(isApplePrivateRelayEmail('abc123@privaterelay.appleid.com')).toBe(
      true,
    );
    expect(isApplePrivateRelayEmail('ABC@PRIVATERELAY.APPLEID.COM')).toBe(true);
    expect(isApplePrivateRelayEmail('ana@icloud.com')).toBe(false);
    expect(isApplePrivateRelayEmail(null)).toBe(false);
  });
});

describe('registration status', () => {
  const me = (registrationStatus: string | null, profiles?: unknown) =>
    toAccount(
      meResponseSchema.parse({
        ...base,
        registrationStatus,
        ...(profiles === undefined ? {} : { profiles }),
      }),
    );

  it('reads a missing status as a sign-up that has not started', () => {
    expect(toRegistrationStatus(null)).toBe('pendingRegistration');
    expect(toRegistrationStatus('')).toBe('pendingRegistration');
    expect(toRegistrationStatus('PENDING_REGISTRATION')).toBe(
      'pendingRegistration',
    );
    expect(toRegistrationStatus('PENDING_COMPLETE_PATIENT')).toBe(
      'pendingCompletePatient',
    );
    expect(toRegistrationStatus('completed')).toBe('completed');
  });

  it('never takes a new status for a sign-up to start', () => {
    expect(toRegistrationStatus('SOMETHING_NEW')).toBe('unknown');
    const account = me('SOMETHING_NEW');
    expect(needsSignUp(account)).toBe(false);
  });

  it('sends a brand-new account to sign up', () => {
    const fresh = me('PENDING_REGISTRATION', {
      patient: { exists: false },
      specialist: { exists: false },
    });
    expect(needsSignUp(fresh)).toBe(true);
    expect(mustFinishPatientSignup(fresh)).toBe(true);

    expect(needsSignUp(me('COMPLETED'))).toBe(false);
  });

  it('lets the patient facet decide whether the sign-up must be finished', () => {
    const complete = me('PENDING_COMPLETE_SPECIALIST', {
      patient: { exists: true, id: 'p', status: 'COMPLETED' },
      specialist: { exists: true, id: 's', status: 'PENDING_KYC' },
    });
    expect(mustFinishPatientSignup(complete)).toBe(false);

    const open = me('PENDING_COMPLETE_PATIENT', {
      patient: { exists: true, id: 'p', status: 'PENDING_PERSONAL_DATA' },
      specialist: { exists: false },
    });
    expect(mustFinishPatientSignup(open)).toBe(true);

    const noFacets = me('PENDING_COMPLETE_PATIENT', null);
    expect(mustFinishPatientSignup(noFacets)).toBe(true);
  });
});

describe('who signs up where', () => {
  const account = (overrides: Record<string, unknown>) =>
    toAccount(meResponseSchema.parse({ ...base, ...overrides }));

  it('never sends an admin to the sign-up form', () => {
    expect(
      needsSignUp(
        account({ role: 'ADMIN', registrationStatus: null, profiles: null }),
      ),
    ).toBe(false);
  });

  it('sends an open specialist sign-up to the app, but not one under review', () => {
    const pending = account({
      role: 'SPECIALIST',
      profiles: {
        patient: { exists: false },
        specialist: { exists: true, id: 's', status: 'PENDING_KYC' },
      },
    });
    expect(specialistMustFinishInApp(pending)).toBe(true);

    const review = account({
      role: 'SPECIALIST',
      profiles: {
        patient: { exists: false },
        specialist: { exists: true, id: 's', status: 'WAITING_ADMIN_REVIEW' },
      },
    });
    expect(specialistMustFinishInApp(review)).toBe(false);
    expect(specialistMustFinishInApp(account({}))).toBe(false);
  });
});

describe('sign-up bodies', () => {
  it('take only what the API expects', () => {
    expect(
      patientRegistrationBodySchema.safeParse({
        firstName: 'Ana',
        lastName: 'Pérez',
        acceptedTerms: true,
        acceptedSensitiveData: true,
        acceptedNewsletter: false,
        role: 'PATIENT',
      }).success,
    ).toBe(true);
    expect(
      patientRegistrationBodySchema.safeParse({
        firstName: 'Ana',
        lastName: 'Pérez',
        acceptedTerms: false,
        acceptedSensitiveData: true,
        acceptedNewsletter: false,
        role: 'PATIENT',
      }).success,
    ).toBe(false);
    expect(
      patientCompletionBodySchema.safeParse({
        dateOfBirth: '1990-01-15',
        phone: '+584141234567',
        documentType: 'V',
        documentNumber: '12345678',
        sex: 'FEMALE',
        extra: true,
      }).success,
    ).toBe(false);
  });
});
