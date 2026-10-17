import type { ReactNode } from 'react';

import { cn } from '@/app/lib/utils';

import { FrameTransition } from '@/app/ui/motion/view-transitions';

type PageFrameProps = {
  /** `narrow` for a patient's flow (32 rem), `content` for the reading width. */
  width?: 'narrow' | 'content';
  className?: string;
  children: ReactNode;
};

/*
 * A page's column under its bar, and its `main` landmark. A segment that
 * needs a session puts it in its layout, around the session guard, so the
 * guard's own states — a failed account, the wrong area — sit inside the
 * page's main too, with the same margins as the page. When the person
 * moves to a page out of this frame, or arrives from one, the whole main
 * leaves or arrives (`FrameTransition`, AGENTS.md §8, rule 13).
 */
export function PageFrame({
  width = 'narrow',
  className,
  children,
}: PageFrameProps) {
  return (
    <FrameTransition>
      <main
        className={cn(
          'mx-auto flex w-full flex-1 flex-col px-gutter pb-16',
          width === 'narrow' ? 'max-w-lg pt-6' : 'max-w-content pt-4',
          className,
        )}
      >
        {children}
      </main>
    </FrameTransition>
  );
}
