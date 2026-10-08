import type { ComponentProps } from 'react';

import { cn } from '@/app/lib/utils';

import { Icon, type IconComponent } from '@/app/ui/icons';

import type { IconTone } from '../_data/landing-content';

const tones: Record<IconTone, string> = {
  blue: 'bg-blue-50 text-primary',
  green: 'bg-green-50 text-secondary',
  orange: 'bg-orange-50 text-orange-500',
  warning: 'bg-warning-50 text-warning-500',
};

const sizes = {
  sm: { circle: 'size-10', icon: 20 },
  md: { circle: 'size-12', icon: 24 },
  lg: { circle: 'size-16', icon: 24 },
} as const;

type IconBadgeProps = ComponentProps<'span'> & {
  icon: IconComponent;
  tone: IconTone;
  /** 40 px with a 20 px icon, 48 px with a 24 px icon, or 64 px with a 32 px icon. */
  size?: keyof typeof sizes;
};

/** An icon in a tinted circle, as the steps and the roadmap cards show them. */
export function IconBadge({
  icon,
  tone,
  size = 'md',
  className,
  ...props
}: IconBadgeProps) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full',
        sizes[size].circle,
        tones[tone],
        className,
      )}
      {...props}
    >
      <Icon
        icon={icon}
        size={sizes[size].icon}
        className={size === 'lg' ? 'size-8' : ''}
      />
    </span>
  );
}
