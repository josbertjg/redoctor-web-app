import type { Plan } from '@/app/lib/schemas/billing';

import type { useTranslations } from 'next-intl';

type Translate = ReturnType<typeof useTranslations<'billing'>>;

/** What a plan includes, derived from its limits as the app derives it. */
export function planBenefits(
  t: Translate,
  plan: Pick<Plan, 'maxActiveClinics' | 'canExportReports'>,
): string[] {
  const clinics =
    plan.maxActiveClinics == null
      ? t('plans.benefits.unlimitedClinics')
      : plan.maxActiveClinics === 1
        ? t('plans.benefits.oneClinic')
        : t('plans.benefits.manyClinics', { count: plan.maxActiveClinics });
  return [
    t('plans.benefits.search'),
    clinics,
    ...(plan.canExportReports ? [t('plans.benefits.exportReports')] : []),
  ];
}
