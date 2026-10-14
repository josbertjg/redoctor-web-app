'use client';

import { useId, type ReactNode } from 'react';

import { cn } from '@/app/lib/utils';

import { Icon, type IconComponent } from '@/app/ui/icons';
import {
  AnimatePresence,
  houseTransition,
  m,
  useReducedMotion,
} from '@/app/ui/motion';
import { Skeleton } from '@/app/ui/skeleton';

/*
 * The list under a search box: a white card that fades down into place
 * and up out of it, its options in groups with a small title each. The
 * pointer keeps the focus in the box (a press on the list never blurs
 * it), so a tap on an option is one tap.
 */

type SuggestionPopupProps = {
  open: boolean;
  id: string;
  label: string;
  children: ReactNode;
  className?: string;
};

export function SuggestionPopup({
  open,
  id,
  label,
  children,
  className,
}: SuggestionPopupProps) {
  const reduced = useReducedMotion();
  const transition = reduced ? { duration: 0 } : houseTransition('fast');

  return (
    <AnimatePresence>
      {open ? (
        <m.div
          key="popup"
          id={id}
          role="listbox"
          aria-label={label}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={transition}
          onMouseDown={(event) => {
            event.preventDefault();
          }}
          className={cn(
            'absolute inset-x-0 top-[calc(100%+0.5rem)] z-30 max-h-[min(60vh,28rem)] overflow-y-auto overscroll-contain rounded-2xl bg-pure-white p-2 text-left text-text-primary shadow-lg ring-1 ring-divider',
            className,
          )}
        >
          {children}
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}

/** A group of options with its title («Especialidades», «Lugares»). */
export function SuggestionGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const titleId = useId();
  return (
    <div role="group" aria-labelledby={titleId} className="py-1">
      <div
        id={titleId}
        className="px-3 pt-2 pb-1 text-label-sm tracking-wide text-text-secondary uppercase"
      >
        {title}
      </div>
      {children}
    </div>
  );
}

type SuggestionOptionProps = {
  id: string;
  active: boolean;
  onActivate: () => void;
  onPick: () => void;
  /** An icon in front, or a picture of its own (an avatar). */
  icon?: IconComponent;
  leading?: ReactNode;
  children: ReactNode;
  /** At the row's end: a specialty beside a specialist, a button to forget a search. */
  trailing?: ReactNode;
  className?: string;
};

/** One option of the list: the pointer puts it in hand, a tap takes it. */
export function SuggestionOption({
  id,
  active,
  onActivate,
  onPick,
  icon,
  leading,
  children,
  trailing,
  className,
}: SuggestionOptionProps) {
  return (
    <div
      id={id}
      role="option"
      aria-selected={active}
      data-active={active || undefined}
      // The box keeps the focus and names the option in hand
      // (aria-activedescendant); the row itself is never tabbed to.
      tabIndex={-1}
      onMouseMove={() => {
        if (!active) onActivate();
      }}
      onClick={onPick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onPick();
        }
      }}
      className={cn(
        'flex min-h-touch cursor-pointer items-center gap-3 rounded-lg px-3 py-1.5 text-body-md transition-colors duration-fast ease-house data-active:bg-info-light',
        className,
      )}
    >
      {leading ??
        (icon ? (
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-variant text-text-secondary">
            <Icon icon={icon} size={18} />
          </span>
        ) : null)}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {trailing}
    </div>
  );
}

/** Rows that stand for what is still on its way (the app's five). */
export function SuggestionSkeletonRows({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-1 px-3 py-1.5">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex min-h-touch items-center gap-3">
          <Skeleton className="size-7 rounded-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}

/** A line with no options to offer. */
export function SuggestionNote({ children }: { children: ReactNode }) {
  return (
    <p className="px-3 py-3 text-body-md text-text-secondary">{children}</p>
  );
}
