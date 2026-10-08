import { cn } from '@/app/lib/utils';

import { Icon, type IconComponent } from '@/app/ui/icons';

import type { IconTone } from '../_data/landing-content';

const tones: Record<IconTone, string> = {
  blue: 'bg-blue-50 text-primary',
  green: 'bg-green-50 text-secondary',
  orange: 'bg-orange-50 text-orange-500',
  warning: 'bg-warning-50 text-warning-500',
};

type IconBadgeProps = {
  icon: IconComponent;
  tone: IconTone;
  /** 48 px with a 24 px icon, or 64 px with a 32 px icon. */
  size?: 'md' | 'lg';
  className?: string;
};

/** An icon in a tinted circle, as the steps and the roadmap cards show them. */
export function IconBadge({
  icon,
  tone,
  size = 'md',
  className,
}: IconBadgeProps) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full',
        size === 'lg' ? 'size-16' : 'size-12',
        tones[tone],
        className,
      )}
    >
      <Icon icon={icon} size={24} className={size === 'lg' ? 'size-8' : ''} />
    </span>
  );
}
