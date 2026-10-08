import type { ComponentProps } from 'react';

import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/app/lib/utils';

import { Icon, type IconComponent } from '@/app/ui/icons';

const stateChipVariants = cva(
  'inline-flex h-6 w-fit shrink-0 animate-fade-in items-center gap-1 rounded-full px-2.5 text-label-md whitespace-nowrap',
  {
    variants: {
      tone: {
        positive: 'bg-success-light text-green-800',
        accent: 'bg-orange-100 text-orange-800',
        neutral: 'bg-silver-100 text-silver-800',
        warning: 'bg-warning-light text-warning-800',
        error: 'bg-error-light text-error-800',
        verified: 'bg-verified-light text-verified-800',
        info: 'bg-info-light text-blue-800',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

type StateChipProps = ComponentProps<'span'> &
  VariantProps<typeof stateChipVariants> & {
    icon?: IconComponent;
  };

/*
 * The state of an appointment, a payment or a specialist, with a tone that
 * never relies on color alone: the label says it too (StateChip in the app).
 */
export function StateChip({
  tone = 'neutral',
  icon,
  className,
  children,
  ...props
}: StateChipProps) {
  return (
    <span
      data-slot="state-chip"
      data-tone={tone}
      className={cn(stateChipVariants({ tone }), className)}
      {...props}
    >
      {icon ? <Icon icon={icon} size={16} /> : null}
      {children}
    </span>
  );
}
