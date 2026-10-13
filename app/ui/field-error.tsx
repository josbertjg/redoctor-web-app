'use client';

import { useState } from 'react';

import { cn } from '@/app/lib/utils';

type FieldErrorProps = {
  id: string;
  /** The error to show; `undefined` when the field is fine. */
  message: string | undefined;
  className?: string;
};

/*
 * The error line under a field (AGENTS.md §8.2): it unfolds in the base
 * duration and folds back keeping its last text, so nothing pops. Read
 * aloud as it changes. Color is never the only signal: the words say it.
 *
 * The text kept for folding back is hidden from screen readers, so it is
 * never read as a current error; and each time the error comes back the line
 * is drawn anew, so the same error is announced again.
 */
export function FieldError({ id, message, className }: FieldErrorProps) {
  const open = message !== undefined;
  const [last, setLast] = useState(message);
  const [wasOpen, setWasOpen] = useState(open);
  const [shown, setShown] = useState(open ? 1 : 0);
  if (message !== undefined && message !== last) setLast(message);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setShown((times) => times + 1);
  }

  return (
    <div
      id={id}
      aria-live="polite"
      data-open={open || undefined}
      className={cn(
        'grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity] duration-base ease-house data-open:grid-rows-[1fr] data-open:opacity-100',
        className,
      )}
    >
      <p
        key={shown}
        aria-hidden={open ? undefined : true}
        className="overflow-hidden text-body-sm text-error-700"
      >
        {open ? message : last}
      </p>
    </div>
  );
}
