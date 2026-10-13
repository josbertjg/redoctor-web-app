/*
 * The account as the web reasons about it, apart from the API's contract:
 * who the person is (their role and facets) and where their sign-up stands,
 * with the rules that follow. No zod here — the session's bar and provider
 * read these on every page, the landing included, and the contract that
 * parses `/identity/me` (app/lib/schemas/identity.ts) loads only once
 * someone is signed in (AGENTS.md §8.10).
 */

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

/**
 * Whether the specialist's profile shows in the search and, when it does
 * not, the first thing the API finds missing (`visibilityStatus`, the app's
 * ProfileVisibilityStatus).
 */
export type ProfileVisibility =
  | 'visible'
  | 'profileIncomplete'
  | 'noSpecialties'
  | 'specialtiesPending'
  | 'specialtiesRejected'
  | 'noOffices'
  | 'noSchedules'
  | 'noMotivesAndPrices'
  | 'verifyingSubscriptionPayment'
  | 'noSubscription';

const profileVisibilities: Readonly<Record<string, ProfileVisibility>> = {
  VISIBLE: 'visible',
  PROFILE_INCOMPLETE: 'profileIncomplete',
  NO_SPECIALTIES: 'noSpecialties',
  SPECIALTIES_PENDING: 'specialtiesPending',
  SPECIALTIES_REJECTED: 'specialtiesRejected',
  NO_OFFICES: 'noOffices',
  NO_SCHEDULES: 'noSchedules',
  NO_MOTIVES_AND_PRICES: 'noMotivesAndPrices',
  VERIFYING_SUBSCRIPTION_PAYMENT: 'verifyingSubscriptionPayment',
  NO_SUBSCRIPTION: 'noSubscription',
};

/** `null` when the API sends none (a patient's account) or one this version does not know. */
export function toProfileVisibility(
  raw: string | null | undefined,
): ProfileVisibility | null {
  return raw ? (profileVisibilities[raw.toUpperCase()] ?? null) : null;
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
  /** The specialist's profile in the search; `null` without one. */
  visibility: ProfileVisibility | null;
};

/**
 * A sign-in with no sign-up behind it: the API says so with
 * `PENDING_REGISTRATION` (or no status at all), and the app then sends the
 * person to the sign-up form — the web too (M3; patients only, a specialist
 * signs up in the app). An admin's account is never one of them.
 */
export function needsSignUp(account: Account): boolean {
  return (
    account.registration === 'pendingRegistration' && account.role !== 'admin'
  );
}

/**
 * A specialist whose sign-up is still open: it can only be finished in the
 * app (owner's decision, 2026-10-12). Waiting for the admins' review is not
 * one of those: the app is already theirs to use meanwhile.
 */
export function specialistMustFinishInApp(account: Account): boolean {
  const { specialist } = account;
  return specialist.isIncomplete && specialist.status !== 'waitingAdminReview';
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
