import { z } from 'zod';

/*
 * `GET /identity/me` (AGENTS.md §5): the account behind a Firebase token.
 * One account can be a patient and a specialist at once, each facet with its
 * own sign-up: `profiles.patient` and `profiles.specialist` say whether the
 * facet exists, where its sign-up stands and what the API expects next.
 * `role` describes the specialist facet when both exist, so the web guards
 * by facet, never by role alone (the app's AccountProfiles).
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

/**
 * Where a facet's sign-up stands. The first three belong to the patient; the
 * specialist goes from `pendingPhoneVerification` on. `unknown` is a status
 * this version has not met: not complete, not a step to demand either —
 * demanding something we cannot name only leads to the wrong screen.
 */
export type FacetStatus =
  | 'pendingPersonalData'
  | 'pendingPhoneVerification'
  | 'pendingKyc'
  | 'pendingKycDataVerification'
  | 'pendingSpecialties'
  | 'waitingAdminReview'
  | 'completed'
  | 'unknown';

const facetStatuses: readonly Exclude<FacetStatus, 'unknown'>[] = [
  'pendingPersonalData',
  'pendingPhoneVerification',
  'pendingKyc',
  'pendingKycDataVerification',
  'pendingSpecialties',
  'waitingAdminReview',
  'completed',
];

/** `PENDING_KYC`, `pendingKyc` and `pending-kyc` all name the same status. */
export function toFacetStatus(raw: string | null | undefined): FacetStatus {
  if (!raw) return 'unknown';
  const key = raw.replace(/[_\s-]/g, '').toLowerCase();
  return (
    facetStatuses.find((status) => status.toLowerCase() === key) ?? 'unknown'
  );
}

export type AccountFacet = {
  exists: boolean;
  id: string | null;
  /** `null` while the facet does not exist. */
  status: FacetStatus | null;
  nextStep: string | null;
  isComplete: boolean;
  /** Exists and its sign-up is still open. An unknown status is neither. */
  isIncomplete: boolean;
};

export type AccountRole = 'patient' | 'specialist' | 'admin' | 'unknown';

/**
 * Where the account's sign-up stands as a whole (`registrationStatus`): the
 * app's RegistrationStatus. A missing value means the sign-up has not even
 * started — the API answers that for a brand-new Firebase account — while a
 * value this version does not know is `unknown`: it must never send someone
 * already registered to the sign-up form.
 */
export type RegistrationStatus =
  | 'pendingRegistration'
  | 'pendingCompletePatient'
  | 'pendingKyc'
  | 'pendingCompleteSpecialist'
  | 'pendingPhoneVerification'
  | 'pendingKycDataVerification'
  | 'waitingAdminReview'
  | 'completed'
  | 'unknown';

const registrationStatuses: Readonly<Record<string, RegistrationStatus>> = {
  PENDING_REGISTRATION: 'pendingRegistration',
  PENDING_COMPLETE_PATIENT: 'pendingCompletePatient',
  PENDING_KYC: 'pendingKyc',
  PENDING_COMPLETE_SPECIALIST: 'pendingCompleteSpecialist',
  PENDING_PHONE_VERIFICATION: 'pendingPhoneVerification',
  PENDING_KYC_DATA_VERIFICATION: 'pendingKycDataVerification',
  WAITING_ADMIN_REVIEW: 'waitingAdminReview',
  COMPLETED: 'completed',
};

export function toRegistrationStatus(
  raw: string | null | undefined,
): RegistrationStatus {
  if (raw === null || raw === undefined || raw === '') {
    return 'pendingRegistration';
  }
  return registrationStatuses[raw.toUpperCase()] ?? 'unknown';
}

export type Account = {
  id: string;
  email: string | null;
  name: string | null;
  photo: string | null;
  role: AccountRole;
  registration: RegistrationStatus;
  patient: AccountFacet;
  specialist: AccountFacet;
};

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

const blank = (value: string | null | undefined) =>
  value === undefined || value === null || value.trim() === '' ? null : value;

export function toAccount(me: MeResponse): Account {
  return {
    id: me.id,
    email: blank(me.email),
    name: blank(me.displayName),
    photo: blank(me.photoUrl),
    role: toRole(me.role),
    registration: toRegistrationStatus(me.registrationStatus),
    patient: toFacet(me.profiles?.patient),
    specialist: toFacet(me.profiles?.specialist),
  };
}

/**
 * A sign-in with no sign-up behind it: the app sends these to the sign-up
 * form (M3 on the web; patients only — a specialist signs up in the app).
 */
export function needsSignUp(account: Account): boolean {
  return account.registration === 'pendingRegistration' || hasNoFacet(account);
}

/**
 * The patient's sign-up is still open and must be finished before booking
 * or claiming (the app's `mustFinishPatientSignup`): the patient facet
 * decides when it exists — it is what tells apart the specialist who is
 * also a patient — and the account's status otherwise.
 */
export function mustFinishPatientSignup(account: Account): boolean {
  if (account.patient.exists) return account.patient.isIncomplete;
  return account.registration !== 'completed';
}

/** The specialist's page on the web: their facet, or an admin's account, which lives in the app too. */
export function canUseSpecialistArea(account: Account): boolean {
  return account.specialist.exists || account.role === 'admin';
}

/** An account with no facet at all: a sign-in without a sign-up behind it. */
export function hasNoFacet(account: Account): boolean {
  return !account.patient.exists && !account.specialist.exists;
}

/**
 * The domain of the addresses Apple makes up for «Hide my email». It forwards
 * to the real one, but it is not the address of the same person's Google
 * account, so the two cannot be told apart by email (the app does the same).
 */
export const applePrivateRelayDomain = 'privaterelay.appleid.com';

export function isApplePrivateRelayEmail(
  email: string | null | undefined,
): boolean {
  return (
    typeof email === 'string' &&
    email.toLowerCase().endsWith(`@${applePrivateRelayDomain}`)
  );
}
