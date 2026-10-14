import type { ReactNode } from 'react';

import { cn } from '@/app/lib/utils';

type BottomActionsProps = {
  children: ReactNode;
  /** The column the actions line up with: the page's content, or a narrow flow's. */
  width?: 'content' | 'narrow';
  className?: string;
};

const widths = { content: 'max-w-content', narrow: 'max-w-lg' } as const;

/*
 * The actions that stay at hand at the bottom of a long page (the app's fixed
 * bottom buttons): above the safe area on notched phones, opaque over the
 * content, entering with a fade (AGENTS.md §8.2, §8.5).
 */
export function BottomActions({
  children,
  width = 'content',
  className,
}: BottomActionsProps) {
  return (
    <div
      className={cn(
        'sticky bottom-0 z-10 mt-auto animate-fade-up border-t border-divider bg-background px-gutter pt-3 pb-[max(env(safe-area-inset-bottom),--spacing(3))] shadow-lg',
        className,
      )}
    >
      <div
        className={cn(
          'mx-auto flex w-full flex-col items-center gap-2',
          widths[width],
        )}
      >
        {children}
      </div>
    </div>
  );
}
