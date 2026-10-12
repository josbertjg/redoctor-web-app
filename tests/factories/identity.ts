import type { meResponseSchema } from '@/app/lib/schemas/identity';

import type { z } from 'zod';

type MeInput = z.input<typeof meResponseSchema>;
type FacetInput = NonNullable<NonNullable<MeInput['profiles']>['patient']>;

export const knownUserId = '5c1c1a3e-8d7a-4e0b-9f2e-1f0b7c6d2a11';

/** What `GET /identity/me` answers for a patient whose sign-up is complete. */
export function buildMeResponse(overrides: Partial<MeInput> = {}): MeInput {
  return {
    id: knownUserId,
    externalId: 'firebase-uid-1',
    email: 'ana@example.com',
    emailVerified: true,
    displayName: 'Ana Pérez',
    photoUrl: 'https://lh3.googleusercontent.com/a/photo=s96-c',
    role: 'PATIENT',
    status: 'ACTIVE',
    registrationStatus: 'COMPLETED',
    acceptedTerms: true,
    acceptedSensitiveData: true,
    acceptedNewsletter: false,
    hasProfessionalProfile: false,
    hasOffices: false,
    hasPendingReviews: false,
    profiles: {
      patient: { exists: true, id: 'patient-1', status: 'COMPLETED' },
      specialist: { exists: false },
    },
    ...overrides,
  } as MeInput;
}

export function patientFacet(overrides: Partial<FacetInput> = {}): FacetInput {
  return { exists: true, id: 'patient-1', status: 'COMPLETED', ...overrides };
}

export function specialistFacet(
  overrides: Partial<FacetInput> = {},
): FacetInput {
  return {
    exists: true,
    id: 'specialist-1',
    status: 'COMPLETED',
    ...overrides,
  };
}

/** A specialist with a complete sign-up and no patient facet. */
export function buildSpecialistMeResponse(
  overrides: Partial<MeInput> = {},
): MeInput {
  return buildMeResponse({
    displayName: 'Dr. Luis Gómez',
    role: 'SPECIALIST',
    profiles: { patient: { exists: false }, specialist: specialistFacet() },
    ...overrides,
  });
}
