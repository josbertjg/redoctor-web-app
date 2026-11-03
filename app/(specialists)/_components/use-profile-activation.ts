'use client';

import { useQueries, useQuery } from '@tanstack/react-query';

import type { Account } from '@/app/lib/auth/account';
import type { SessionUser } from '@/app/lib/firebase/client';
import {
  pendingSetupTasks,
  profileActivation,
  readinessOf,
  type ProfileActivation,
  type SetupTask,
} from '@/app/lib/profile/activation';
import {
  myOfficesQueryOptions,
  officePricingQueryOptions,
  officeScheduleQueryOptions,
} from '@/app/lib/queries/offices';
import { myProfileQueryOptions } from '@/app/lib/queries/specialists';
import { specialtiesReview } from '@/app/lib/schemas/specialists';

export type ActivationReading = {
  activation: ProfileActivation;
  /** At least one specialty verified (the app's `canContractPlan` asks it). */
  verifiedSpecialty: boolean | null;
  /** Offices exist and none is active: the step is to turn one on. */
  onlyInactiveOffices: boolean;
  /** What can be set in the app meanwhile (offices, hours, prices). */
  setupTasks: SetupTask[];
  /** Hours or prices of an office still on their way: the tasks may change. */
  resolving: boolean;
};

/*
 * The profile's way to the search on the panel's home (the app's
 * `ProfileActivation.fromUser`): the account's statuses, the plan, and the
 * professional profile with each office's hours and prices — the same reads
 * as «Mi perfil», so the two pages share one cache. Hours count for active
 * offices only; prices for every office, as the app reads them.
 */
export function useProfileActivation(
  user: SessionUser,
  account: Account,
  hasActiveSubscription: boolean | null,
): ActivationReading {
  const profile = useQuery(myProfileQueryOptions(user));
  const offices = useQuery(myOfficesQueryOptions(user));
  const list = offices.data ?? [];
  const schedules = useQueries({
    queries: list.map((office) => ({
      ...officeScheduleQueryOptions(user, office.id),
      enabled: office.isActive,
    })),
  });
  const prices = useQueries({
    queries: list.map((office) => officePricingQueryOptions(user, office.id)),
  });

  const readiness = readinessOf({
    hasOffices: offices.isPending || list.length > 0,
    offices: offices.data
      ? list.map((office, index) => {
          const schedule = schedules[index]?.data;
          const pricing = prices[index]?.data;
          return {
            isActive: office.isActive,
            hasSchedule:
              schedule === undefined
                ? null
                : schedule.groups.some((group) => group.ranges.length > 0),
            hasPricing:
              pricing === undefined
                ? null
                : pricing.reasons.some((reason) => reason.price !== null),
          };
        })
      : null,
  });
  const verifiedSpecialty =
    profile.data === undefined
      ? null
      : profile.data !== null &&
        specialtiesReview(profile.data.specialties) === 'verified';

  const activation = profileActivation({
    account,
    verifiedSpecialty,
    readiness,
    hasActiveSubscription,
  });
  const onlyInactiveOffices =
    list.length > 0 && list.every((office) => !office.isActive);

  return {
    activation,
    verifiedSpecialty,
    onlyInactiveOffices,
    setupTasks: pendingSetupTasks(activation, {
      readiness,
      onlyInactiveOffices,
    }),
    resolving:
      offices.isPending ||
      schedules.some(
        (query) => query.isPending && query.fetchStatus !== 'idle',
      ) ||
      prices.some((query) => query.isPending),
  };
}
