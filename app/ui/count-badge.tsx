'use client';

import { useState } from 'react';

import { cn } from '@/app/lib/utils';

type CountBadgeProps = {
  count: number;
  /** Beyond this the badge says «99+». */
  max?: number;
  className?: string;
};

/*
 * The app's CountBadge: a small blue disc with a number over a control
 * (the notifications' bell). It pops in with the first count and, when the
 * count reaches zero, fades out still showing the last one (AGENTS.md
 * §8.2). Hidden from assistive technology: the control's own label says
 * the number.
 */
export function CountBadge({ count, max = 99, className }: CountBadgeProps) {
  const [shown, setShown] = useState(count);
  const [gone, setGone] = useState(count === 0);

  // Adjusted during render: a new count shows at once, and brings the
  // badge back if it had left.
  if (count > 0 && (shown !== count || gone)) {
    setShown(count);
    setGone(false);
  }

  if (gone) return null;

  const leaving = count === 0;

  return (
    <span
      aria-hidden="true"
      data-slot="count-badge"
      data-leaving={leaving || undefined}
      onAnimationEnd={() => {
        if (leaving) setGone(true);
      }}
      className={cn(
        'pointer-events-none flex h-4.5 min-w-4.5 animate-scale-in items-center justify-center rounded-full bg-primary px-1 text-label-sm leading-none text-on-primary ring-2 ring-pure-white data-leaving:animate-fade-out',
        className,
      )}
    >
      {shown > max ? `${String(max)}+` : shown}
    </span>
  );
}
