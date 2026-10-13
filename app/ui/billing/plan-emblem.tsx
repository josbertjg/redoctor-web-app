import CrownFill from '@material-symbols/svg-400/rounded/crown-fill.svg?svgr';

import { planTier, type PlanTier } from '@/app/lib/schemas/billing';
import { cn } from '@/app/lib/utils';

import { Icon } from '@/app/ui/icons';

/** The crown's metal: bronze, silver and gold, from less to more. */
const emblems: Record<PlanTier, string> = {
  bronze: 'bg-orange-50 text-orange-500',
  silver: 'bg-silver-50 text-silver-600',
  gold: 'bg-warning-50 text-warning-500',
};

/*
 * A plan's crown, in its tier's metal by slug (the app's plan emblem): on
 * «Mi suscripción» and on the panel's home. Decorative: the plan's name
 * stands beside it.
 */
export function PlanEmblem({
  slug,
  size = 'md',
  className,
}: {
  slug: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full',
        size === 'md' ? 'size-14' : 'size-12',
        emblems[planTier(slug)],
        className,
      )}
    >
      <Icon icon={CrownFill} className={size === 'md' ? 'size-7' : 'size-6'} />
    </span>
  );
}
