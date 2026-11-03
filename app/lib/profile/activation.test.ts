// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  activationTone,
  pendingSetupTasks,
  profileActivation,
  readinessOf,
  type PublicationReadiness,
} from './activation';

import type { ProfileVisibility, RegistrationStatus } from '../auth/account';

const everything: PublicationReadiness = {
  hasActiveOffice: true,
  hasSchedules: true,
  hasPricing: true,
};

const unknown: PublicationReadiness = {
  hasActiveOffice: null,
  hasSchedules: null,
  hasPricing: null,
};

const account = (
  registration: RegistrationStatus,
  visibility: ProfileVisibility | null,
) => ({ registration, visibility });

describe('profileActivation', () => {
  it('is active and whole for a visible profile', () => {
    const activation = profileActivation({
      account: account('completed', 'visible'),
      verifiedSpecialty: true,
      readiness: everything,
      hasActiveSubscription: true,
    });

    expect(activation).toMatchObject({
      tone: 'active',
      currentStep: null,
      progressPercent: 100,
      pendingStepCount: 0,
      isVisible: true,
    });
  });

  it('starts a fresh account past the floor, at its credentials', () => {
    const activation = profileActivation({
      account: account('pendingCompleteSpecialist', 'profileIncomplete'),
      verifiedSpecialty: null,
      readiness: unknown,
      hasActiveSubscription: null,
    });

    expect(activation.tone).toBe('pendingVerification');
    expect(activation.steps.identity).toBe('done');
    expect(activation.currentStep).toBe('credentials');
    expect(activation.progressPercent).toBe(50);
    expect(activation.pendingStepCount).toBe(5);
  });

  it('leaves undone only the step the API names now', () => {
    const activation = profileActivation({
      account: account('completed', 'noSchedules'),
      verifiedSpecialty: true,
      readiness: everything,
      hasActiveSubscription: true,
    });

    expect(activation.currentStep).toBe('schedules');
    expect(activation.steps).toEqual({
      identity: 'done',
      credentials: 'done',
      office: 'done',
      schedules: 'current',
      pricing: 'done',
      subscription: 'done',
    });
    expect(activation.pendingStepCount).toBe(1);
    expect(activation.progressPercent).toBe(92);
    expect(activation.tone).toBe('inactive');
  });

  it('counts a step the API passed even when the profile is not loaded', () => {
    const activation = profileActivation({
      account: account('completed', 'noMotivesAndPrices'),
      verifiedSpecialty: null,
      readiness: unknown,
      hasActiveSubscription: null,
    });

    expect(activation.steps).toMatchObject({
      credentials: 'done',
      office: 'done',
      schedules: 'done',
      pricing: 'current',
      subscription: 'pending',
    });
  });
});

describe('activationTone', () => {
  it('reads a payment in review and specialties under review as a review', () => {
    expect(
      activationTone(account('completed', 'verifyingSubscriptionPayment')),
    ).toBe('underReview');
    expect(activationTone(account('completed', 'specialtiesPending'))).toBe(
      'underReview',
    );
    expect(activationTone(account('waitingAdminReview', 'noOffices'))).toBe(
      'underReview',
    );
  });

  it('asks for action on rejected specialties', () => {
    expect(activationTone(account('completed', 'specialtiesRejected'))).toBe(
      'actionNeeded',
    );
  });

  it('tells an open sign-up from a finished one that is not visible', () => {
    expect(
      activationTone(account('pendingCompleteSpecialist', 'profileIncomplete')),
    ).toBe('pendingVerification');
    expect(activationTone(account('completed', 'noSubscription'))).toBe(
      'inactive',
    );
  });
});

describe('readinessOf', () => {
  it('knows there is nothing when the API says there are no offices', () => {
    expect(readinessOf({ hasOffices: false, offices: null })).toEqual({
      hasActiveOffice: false,
      hasSchedules: false,
      hasPricing: false,
    });
  });

  it('does not know yet while the offices are on their way', () => {
    expect(readinessOf({ hasOffices: true, offices: null })).toEqual(unknown);
  });

  it('takes one office with hours as proof, and a «no» only once all are seen', () => {
    expect(
      readinessOf({
        hasOffices: true,
        offices: [
          { isActive: true, hasSchedule: true, hasPricing: null },
          { isActive: true, hasSchedule: null, hasPricing: null },
        ],
      }),
    ).toEqual({ hasActiveOffice: true, hasSchedules: true, hasPricing: null });
    expect(
      readinessOf({
        hasOffices: true,
        offices: [
          { isActive: true, hasSchedule: false, hasPricing: false },
          { isActive: false, hasSchedule: true, hasPricing: true },
        ],
      }),
    ).toEqual({
      hasActiveOffice: true,
      hasSchedules: false,
      hasPricing: false,
    });
  });
});

describe('pendingSetupTasks', () => {
  const review = profileActivation({
    account: account('waitingAdminReview', 'profileIncomplete'),
    verifiedSpecialty: false,
    readiness: unknown,
    hasActiveSubscription: false,
  });

  it('lists what can be set while Redoctor reviews, by what the offices prove', () => {
    expect(
      pendingSetupTasks(review, {
        readiness: {
          hasActiveOffice: false,
          hasSchedules: false,
          hasPricing: false,
        },
        onlyInactiveOffices: false,
      }),
    ).toEqual(['offices', 'schedules', 'pricing']);
    expect(
      pendingSetupTasks(review, {
        readiness: {
          hasActiveOffice: false,
          hasSchedules: false,
          hasPricing: true,
        },
        onlyInactiveOffices: true,
      }),
    ).toEqual(['activateOffice', 'schedules']);
  });

  it('falls back on the API’s steps while the offices are unknown', () => {
    const later = profileActivation({
      account: account('completed', 'noMotivesAndPrices'),
      verifiedSpecialty: true,
      readiness: unknown,
      hasActiveSubscription: false,
    });
    expect(
      pendingSetupTasks(later, {
        readiness: unknown,
        onlyInactiveOffices: false,
      }),
    ).toEqual(['pricing']);
  });
});
