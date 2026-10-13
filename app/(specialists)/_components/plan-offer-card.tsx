import CheckCircleFill from '@material-symbols/svg-400/rounded/check_circle-fill.svg?svgr';

import { formatBillingAmount } from '@/app/lib/format/money';
import type { OfferedPlan } from '@/app/lib/schemas/billing';
import { cn } from '@/app/lib/utils';

import { PlanEmblem } from '@/app/ui/billing/plan-emblem';
import { Icon } from '@/app/ui/icons';

/*
 * The plan a missing feature invites to (the owner's rule of 2026-10-13):
 * its crown, its name and its monthly price, and what it brings that the
 * current one lacks (downloading the statistics, more offices).
 */
export function PlanOfferCard({
  plan,
  benefit,
  perMonth,
  className,
}: {
  plan: OfferedPlan;
  /** What the plan includes that the person asked for, already translated. */
  benefit: string;
  /** «al mes», already translated. */
  perMonth: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex animate-fade-up flex-col gap-3 rounded-2xl bg-pure-white p-4 shadow-md',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <PlanEmblem slug={plan.slug} size="sm" />
        <p className="flex min-w-0 flex-col">
          <span className="text-title-md text-text-primary">{plan.name}</span>
          <span>
            <span className="text-subtitle-s font-bold text-text-primary">
              {formatBillingAmount(plan.price.amount)}
            </span>{' '}
            <span className="text-body-md text-text-secondary">{perMonth}</span>
          </span>
        </p>
      </div>
      <p className="flex items-start gap-2 text-body-sm text-text-primary">
        <Icon
          icon={CheckCircleFill}
          size={16}
          className="mt-0.5 shrink-0 text-primary"
        />
        {benefit}
      </p>
    </div>
  );
}
