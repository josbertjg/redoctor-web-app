import type { ReactNode } from 'react';

import { cn } from '@/app/lib/utils';

import { Icon, type IconComponent } from '@/app/ui/icons';

type LabelChipProps = {
  icon?: IconComponent;
  children: ReactNode;
  className?: string;
};

/* The landing's small blue pill (Figma): a section's chip over its title,
   and the tag on the recommended plan. */
export function LabelChip({ icon, children, className }: LabelChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-label-lg text-primary shadow-sm',
        className,
      )}
    >
      {icon ? <Icon icon={icon} size={16} /> : null}
      {children}
    </span>
  );
}
