import type { Plan } from '../schemas/billing';

/*
 * What a plan includes, derived from its limits as the app derives it
 * (its SubscriptionPlansScreen): the API publishes the limits, never a
 * list of benefits. The landing's plans and the payment's plans both read
 * it; each one puts the words to it in its own place.
 */

export type PlanBenefit =
  | { key: 'search' }
  | { key: 'oneClinic' }
  | { key: 'manyClinics'; count: number }
  | { key: 'unlimitedClinics' }
  | { key: 'exportReports' };

export function planBenefits(
  plan: Pick<Plan, 'maxActiveClinics' | 'canExportReports'>,
): PlanBenefit[] {
  const clinics: PlanBenefit =
    plan.maxActiveClinics == null
      ? { key: 'unlimitedClinics' }
      : plan.maxActiveClinics === 1
        ? { key: 'oneClinic' }
        : { key: 'manyClinics', count: plan.maxActiveClinics };
  return [
    { key: 'search' },
    clinics,
    ...(plan.canExportReports ? [{ key: 'exportReports' } as const] : []),
  ];
}
