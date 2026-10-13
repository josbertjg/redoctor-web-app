import { z } from 'zod';

import {
  toFacetStatus,
  toRegistrationStatus,
  type Account,
  type AccountFacet,
  type AccountRole,
  type FacetStatus,
  type RegistrationStatus,
} from '../auth/account';
import { documentTypes } from '../format/identity-document';

/*
 * `GET /identity/me` (AGENTS.md §5): the account behind a Firebase token.
 * One account can be a patient and a specialist at once, each facet with its
 * own sign-up: `profiles.patient` and `profiles.specialist` say whether the
 * facet exists, where its sign-up stands and what the API expects next.
 * `role` describes the specialist facet when both exist, so the web guards
 * by facet, never by role alone (the app's AccountProfiles). A facet
 * `profiles` does not mark is read from `role` and `registrationStatus`,
 * as the app does (`facetFromAccount`).
 *
 * Only what the UI needs reaches the DTO: no document, no phone, no address.
 */

const facetSchema = z.object({
  exists: z.boolean().optional(),
  id: z.string().nullish(),
  /** Free text in the contract; the catalog lives in `toFacetStatus`. */
  status: z.string().nullish(),
  /** The endpoint the API expects next, as it names it. */
  nextStep: z.string().nullish(),
});

export const meResponseSchema = z.object({
  id: z.string(),
  email: z.string().nullish(),
  displayName: z.string().nullish(),
  photoUrl: z.string().nullish(),
  role: z.string().nullish(),
  status: z.string().nullish(),
  registrationStatus: z.string().nullish(),
  profiles: z
    .object({
      patient: facetSchema.nullish(),
      specialist: facetSchema.nullish(),
    })
    .nullish(),
});

export type MeResponse = z.infer<typeof meResponseSchema>;

const noFacet: AccountFacet = {
  exists: false,
  id: null,
  status: null,
  nextStep: null,
  isComplete: false,
  isIncomplete: false,
};

function toFacet(
  raw: z.infer<typeof facetSchema> | null | undefined,
): AccountFacet {
  if (!raw?.exists) return noFacet;
  const status = toFacetStatus(raw.status);
  return {
    exists: true,
    id: raw.id ?? null,
    status,
    nextStep: raw.nextStep ?? null,
    isComplete: status === 'completed',
    isIncomplete: status !== 'completed' && status !== 'unknown',
  };
}

function toRole(raw: string | null | undefined): AccountRole {
  switch (raw?.toUpperCase()) {
    case 'PATIENT':
      return 'patient';
    case 'SPECIALIST':
      return 'specialist';
    case 'ADMIN':
    case 'SUPER_ADMIN':
      return 'admin';
    default:
      return 'unknown';
  }
}

/**
 * Where a facet's sign-up stands when only the account's own status speaks
 * for it: the patient's two steps, and the specialist's road (the app reads
 * `PENDING_COMPLETE_SPECIALIST` as the specialties step). Anything else is
 * `unknown`, inert on purpose.
 */
const facetStatusByRegistration: Record<
  'patient' | 'specialist',
  Partial<Record<RegistrationStatus, FacetStatus>>
> = {
  patient: {
    pendingCompletePatient: 'pendingPersonalData',
    completed: 'completed',
  },
  specialist: {
    pendingPhoneVerification: 'pendingPhoneVerification',
    pendingKyc: 'pendingKyc',
    pendingKycDataVerification: 'pendingKycDataVerification',
    pendingCompleteSpecialist: 'pendingSpecialties',
    waitingAdminReview: 'waitingAdminReview',
    completed: 'completed',
  },
};

/**
 * A facet `profiles` does not mark, read from the account's own words:
 * `role` says who the person is and `registrationStatus` where that
 * sign-up stands. The app reads them the same way — its screens gate by
 * role, and `profiles` only refines a facet it marks — and the API does not
 * mark a PATIENT account's patient facet (seen 2026-10-12), so trusting
 * `profiles.*.exists` alone locked patients out of their own pages.
 */
function facetFromAccount(
  facet: 'patient' | 'specialist',
  role: AccountRole,
  registration: RegistrationStatus,
): AccountFacet {
  if (role !== facet || registration === 'pendingRegistration') return noFacet;
  const status = facetStatusByRegistration[facet][registration] ?? 'unknown';
  return {
    exists: true,
    id: null,
    status,
    nextStep: null,
    isComplete: status === 'completed',
    isIncomplete: status !== 'completed' && status !== 'unknown',
  };
}

const blank = (value: string | null | undefined) =>
  value === undefined || value === null || value.trim() === '' ? null : value;

export function toAccount(me: MeResponse): Account {
  const role = toRole(me.role);
  const registration = toRegistrationStatus(me.registrationStatus);
  const facet = (name: 'patient' | 'specialist'): AccountFacet => {
    const marked = toFacet(me.profiles?.[name]);
    return marked.exists ? marked : facetFromAccount(name, role, registration);
  };

  return {
    id: me.id,
    email: blank(me.email),
    name: blank(me.displayName),
    photo: blank(me.photoUrl),
    role,
    registration,
    patient: facet('patient'),
    specialist: facet('specialist'),
  };
}

/*
 * The patient's sign-up, in two writes as the API and the app split it:
 * `POST /identity/register` (names and the consents), then, once the
 * account is `PENDING_COMPLETE_PATIENT`, `POST /identity/complete-registration`
 * (the personal data claiming or booking needs). Both answer the account,
 * parsed with `meResponseSchema`. The bodies are strict on purpose: the API
 * refuses any field it does not expect.
 */
export const patientRegistrationBodySchema = z.strictObject({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  acceptedTerms: z.literal(true),
  acceptedSensitiveData: z.literal(true),
  acceptedNewsletter: z.boolean(),
  role: z.literal('PATIENT'),
});

export type PatientRegistrationBody = z.infer<
  typeof patientRegistrationBodySchema
>;

/** The sexes the API takes; the app's form offers the first two. */
export const sexes = ['MALE', 'FEMALE', 'OTHER'] as const;

export type Sex = (typeof sexes)[number];

export const patientCompletionBodySchema = z.strictObject({
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  phone: z.string().min(1),
  documentType: z.enum(documentTypes),
  documentNumber: z.string().regex(/^\d{6,8}$/),
  sex: z.enum(sexes),
});

export type PatientCompletionBody = z.infer<typeof patientCompletionBodySchema>;

/** `POST /identity/public/check-document`: whether nobody uses the document yet. */
export const documentAvailabilitySchema = z.object({ available: z.boolean() });

export const documentQuerySchema = z.strictObject({
  documentType: z.enum(documentTypes),
  documentNumber: z.string().regex(/^\d{6,8}$/),
});

export type DocumentQuery = z.infer<typeof documentQuerySchema>;

// The account's model and rules live apart from the contract, without zod.
export {
  applePrivateRelayDomain,
  canUseSpecialistArea,
  hasNoFacet,
  isApplePrivateRelayEmail,
  mustFinishPatientSignup,
  needsSignUp,
  specialistMustFinishInApp,
  toFacetStatus,
  toRegistrationStatus,
} from '../auth/account';
export type {
  Account,
  AccountFacet,
  AccountRole,
  FacetStatus,
  RegistrationStatus,
} from '../auth/account';
