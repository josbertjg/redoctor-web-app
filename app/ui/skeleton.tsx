import type { ComponentProps } from 'react';

import { cn } from '@/app/lib/utils';

/*
 * A placeholder with the final dimensions of what it stands for, so the
 * content swaps in with zero layout shift (AGENTS.md §8.2). Size it with
 * className; it is invisible to assistive technology.
 */
export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      aria-hidden="true"
      data-slot="skeleton"
      className={cn(
        'animate-pulse rounded-lg bg-surface-variant motion-reduce:animate-none',
        className,
      )}
      {...props}
    />
  );
}
