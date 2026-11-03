import type {
  Account,
  ProfileVisibility,
  RegistrationStatus,
} from '../auth/account';

/*
 * How far a specialist is from showing in the search, as the app tells it
 * (its `ProfileActivation`, `PublicationReadiness` and the home's card):
 * six steps in the order the API blocks them, a bar that never shows 0 % to
 * someone with an account, and a tone for the profile's badge. Derived, no
 * state: it is read again whenever the account or the profile changes.
 *
 * `visibilityStatus` names only the first thing missing, so each step is
 * judged by its own proof — the API's, once the block is past it, or the
 * loaded profile's —, except the step the API names now, which no local
 * proof can pass. A step lost (an office turned off) costs that step alone.
 */

export type ActivationStep =
  | 'identity'
  | 'credentials'
  | 'office'
  | 'schedules'
  | 'pricing'
  | 'subscription';

const steps: readonly ActivationStep[] = [
  'identity',
  'credentials',
  'office',
  'schedules',
  'pricing',
  'subscription',
];

/** The badge's tone: whose turn it is — the specialist's, Redoctor's — or that something failed. */
export type ActivationTone =
  | 'active'
  | 'underReview'
  | 'pendingVerification'
  | 'inactive'
  | 'actionNeeded';

export type StepState = 'done' | 'current' | 'pending';

/**
 * What the specialist's own data proves: an active office, hours at one,
 * a reason with a price at one. `null` while it is not known yet (each
 * office's hours and prices arrive apart): «not yet» is never «no».
 */
export type PublicationReadiness = {
  hasActiveOffice: boolean | null;
  hasSchedules: boolean | null;
  hasPricing: boolean | null;
};

export type ProfileActivation = {
  tone: ActivationTone;
  /** The first step not done; `null` once the profile is visible. */
  currentStep: ActivationStep | null;
  steps: Record<ActivationStep, StepState>;
  progressPercent: number;
  pendingStepCount: number;
  isVisible: boolean;
};

type ActivationAccount = Pick<Account, 'registration' | 'visibility'>;

/** An office as the proofs need it: active, and whether its hours and prices are set (`null`: not known yet). */
export type ReadinessOffice = {
  isActive: boolean;
  hasSchedule: boolean | null;
  hasPricing: boolean | null;
};

/** No one with an account sees 0 %. */
const progressFloor = 0.25;
/** The bar's milestones: finer than the steps, so it moves inside the sign-up too. */
const milestoneCount = 9;

/** The sign-up's ladder, written out: `pendingCompletePatient` is not on this path. */
const registrationRank: Record<RegistrationStatus, number> = {
  pendingRegistration: 0,
  pendingCompletePatient: 0,
  pendingPhoneVerification: 1,
  pendingKyc: 2,
  pendingKycDataVerification: 3,
  pendingCompleteSpecialist: 4,
  waitingAdminReview: 5,
  completed: 6,
  // A status this version does not know proves nothing.
  unknown: 0,
};

/** The path to the search; the three states of the specialties share a rank. */
const visibilityRank: Record<ProfileVisibility, number> = {
  profileIncomplete: 0,
  noSpecialties: 1,
  specialtiesPending: 1,
  specialtiesRejected: 1,
  noOffices: 2,
  noSchedules: 3,
  noMotivesAndPrices: 4,
  verifyingSubscriptionPayment: 5,
  noSubscription: 5,
  visible: 6,
};

/** The step the API names as the block right now: no local proof passes it. */
const blockedStep: Record<ProfileVisibility, ActivationStep | null> = {
  profileIncomplete: 'credentials',
  noSpecialties: 'credentials',
  specialtiesPending: 'credentials',
  specialtiesRejected: 'credentials',
  noOffices: 'office',
  noSchedules: 'schedules',
  noMotivesAndPrices: 'pricing',
  verifyingSubscriptionPayment: 'subscription',
  noSubscription: 'subscription',
  visible: null,
};

/**
 * The profile's tone, as the app's badge reads it (its KYC rejection aside:
 * the web reads no KYC status). A rejection outweighs everything, a review
 * outweighs the generic «sign-up in progress».
 */
export function activationTone(account: ActivationAccount): ActivationTone {
  const { registration, visibility } = account;
  if (visibility === 'visible') return 'active';
  if (visibility === 'specialtiesRejected') return 'actionNeeded';
  if (
    registration === 'waitingAdminReview' ||
    visibility === 'specialtiesPending' ||
    visibility === 'verifyingSubscriptionPayment'
  ) {
    return 'underReview';
  }
  if (registration !== 'completed') return 'pendingVerification';
  return 'inactive';
}

export function profileActivation(input: {
  account: ActivationAccount;
  /** A specialty verified in the loaded profile; `null` when it is not loaded. */
  verifiedSpecialty: boolean | null;
  readiness: PublicationReadiness;
  /** A plan giving visibility; `null` when it is not known here. */
  hasActiveSubscription: boolean | null;
}): ProfileActivation {
  const { account, verifiedSpecialty, readiness, hasActiveSubscription } =
    input;
  const registered = account.registration === 'completed';
  const ladder = registrationRank[account.registration];
  const reached =
    account.visibility === null ? -1 : visibilityRank[account.visibility];
  const blocked =
    account.visibility === null ? null : blockedStep[account.visibility];

  const resolve = (step: ActivationStep, byApi: boolean, byProfile: boolean) =>
    step !== blocked && (byApi || byProfile);

  const done: Record<ActivationStep, boolean> = {
    identity: ladder > registrationRank.pendingKycDataVerification,
    credentials: resolve(
      'credentials',
      registered && reached > 1,
      registered && verifiedSpecialty === true,
    ),
    office: resolve('office', reached > 2, readiness.hasActiveOffice === true),
    schedules: resolve(
      'schedules',
      reached > 3,
      readiness.hasSchedules === true,
    ),
    pricing: resolve('pricing', reached > 4, readiness.hasPricing === true),
    subscription: resolve(
      'subscription',
      reached > 5,
      hasActiveSubscription === true,
    ),
  };

  const currentStep = steps.find((step) => !done[step]) ?? null;
  const milestones = [
    ladder > registrationRank.pendingPhoneVerification,
    ladder > registrationRank.pendingKyc,
    ladder > registrationRank.pendingKycDataVerification,
    ladder > registrationRank.pendingCompleteSpecialist,
    done.credentials,
    done.office,
    done.schedules,
    done.pricing,
    done.subscription,
  ].filter(Boolean).length;
  const progress =
    progressFloor + (1 - progressFloor) * (milestones / milestoneCount);
  const tone = activationTone(account);

  return {
    tone,
    currentStep,
    steps: Object.fromEntries(
      steps.map((step) => [
        step,
        done[step] ? 'done' : step === currentStep ? 'current' : 'pending',
      ]),
    ) as Record<ActivationStep, StepState>,
    progressPercent: Math.round(progress * 100),
    pendingStepCount: steps.filter((step) => !done[step]).length,
    isVisible: tone === 'active',
  };
}

/**
 * What the specialist's offices prove (the app's `PublicationReadiness`).
 * The offices are read only when the API says there are some: without
 * them, «none» is the answer, not «not yet». Only active offices count; one
 * office with hours proves there are hours, while a «no» needs them all seen.
 */
export function readinessOf(input: {
  hasOffices: boolean;
  offices: readonly ReadinessOffice[] | null;
}): PublicationReadiness {
  if (input.offices === null) {
    return input.hasOffices
      ? { hasActiveOffice: null, hasSchedules: null, hasPricing: null }
      : { hasActiveOffice: false, hasSchedules: false, hasPricing: false };
  }
  const active = input.offices.filter((office) => office.isActive);
  const proof = (has: (office: ReadinessOffice) => boolean | null) =>
    active.some((office) => has(office) === true)
      ? true
      : active.every((office) => has(office) !== null)
        ? false
        : null;
  return {
    hasActiveOffice: active.length > 0,
    hasSchedules: proof((office) => office.hasSchedule),
    hasPricing: proof((office) => office.hasPricing),
  };
}

/** What the specialist can set in the app while Redoctor reviews (the app's `ProfileSetupTask`). */
export type SetupTask = 'offices' | 'activateOffice' | 'schedules' | 'pricing';

/**
 * The profile's setup still missing, in the order it is best done: what
 * the offices prove first, and the API's steps while they are not known.
 */
export function pendingSetupTasks(
  activation: ProfileActivation,
  facts: { readiness: PublicationReadiness; onlyInactiveOffices: boolean },
): SetupTask[] {
  const { readiness, onlyInactiveOffices } = facts;
  const hasOffices =
    readiness.hasActiveOffice ?? activation.steps.office === 'done';
  const hasSchedules =
    readiness.hasSchedules ?? activation.steps.schedules === 'done';
  const hasPricing =
    readiness.hasPricing ?? activation.steps.pricing === 'done';
  const tasks: SetupTask[] = [];
  if (!hasOffices)
    tasks.push(onlyInactiveOffices ? 'activateOffice' : 'offices');
  if (!hasSchedules) tasks.push('schedules');
  if (!hasPricing) tasks.push('pricing');
  return tasks;
}
