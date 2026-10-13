'use client';

import { useEffect, useState, type ReactNode } from 'react';

import { cn } from '@/app/lib/utils';

/** Longer than `--duration-base`: by then the fold is over, whether or not an event said so. */
const settleMs = 400;

/*
 * A piece of «Mi suscripción» that comes and goes as the subscription
 * moves — a plan cancelled or resumed, a coupon applied — and never
 * appears or disappears at once (AGENTS.md §8.2): it unfolds from nothing
 * while it fades in, and folds back out. Folded it takes no room, the
 * column's gap included (`gap-4`), and nothing in it can be reached;
 * once folded it leaves the page.
 */
export function Collapse({
  open,
  children,
}: {
  open: boolean;
  children: ReactNode;
}) {
  // In the page: while open, and while it folds away.
  const [present, setPresent] = useState(open);
  // Unfolded: one frame after it arrives folded, so there is something to grow from.
  const [unfolded, setUnfolded] = useState(open);
  const [wasOpen, setWasOpen] = useState(open);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setPresent(true);
      setUnfolded(false);
    }
  }

  useEffect(() => {
    if (open) {
      const frame = window.requestAnimationFrame(() => {
        setUnfolded(true);
      });
      return () => {
        window.cancelAnimationFrame(frame);
      };
    }
    const timer = window.setTimeout(() => {
      setPresent(false);
    }, settleMs);
    return () => {
      window.clearTimeout(timer);
    };
  }, [open]);

  if (!present) return null;
  const expanded = open && unfolded;

  return (
    <div
      aria-hidden={expanded ? undefined : true}
      inert={!expanded}
      className={cn(
        'grid transition-[grid-template-rows,opacity,margin] duration-base ease-house',
        expanded
          ? 'grid-rows-[1fr] opacity-100'
          : '-mt-4 grid-rows-[0fr] opacity-0',
      )}
    >
      <div className={cn('min-h-0', !expanded && 'overflow-hidden')}>
        {children}
      </div>
    </div>
  );
}
