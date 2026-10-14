import {
  planBenefits,
  type PlanBenefit,
} from '@/app/lib/billing/plan-benefits';
import type { Plan } from '@/app/lib/schemas/billing';

import type { useTranslations } from 'next-intl';

type Translate = ReturnType<typeof useTranslations<'billing'>>;

const words = (t: Translate, benefit: PlanBenefit): string =>
  benefit.key === 'manyClinics'
    ? t('plans.benefits.manyClinics', { count: benefit.count })
    : t(`plans.benefits.${benefit.key}`);

/** What a plan includes, in the app's words (derived in app/lib/billing). */
export function planBenefitWords(
  t: Translate,
  plan: Pick<Plan, 'maxActiveClinics' | 'canExportReports'>,
): string[] {
  return planBenefits(plan).map((benefit) => words(t, benefit));
}
