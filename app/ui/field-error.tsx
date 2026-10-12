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
 */
export function FieldError({ id, message, className }: FieldErrorProps) {
  const [last, setLast] = useState(message);
  if (message !== undefined && message !== last) setLast(message);
  const open = message !== undefined;

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
      <p className="overflow-hidden text-body-sm text-error-700">
        {open ? message : last}
      </p>
    </div>
  );
}
