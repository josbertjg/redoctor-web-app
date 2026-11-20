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
 * The list under a search box (Figma, 2026-11-16): a white card that fades
 * down into place and up out of it, its rows a 16 px icon and the words —
 * a second, smaller line when there is one —, the row in hand on the blue
 * tint. The icon tells a row's kind apart, so no title shows over a group
 * (screen readers still hear it). The pointer keeps the focus in the box
 * (a press on the list never blurs it), so a tap on an option is one tap.
 */

type SuggestionPopupProps = {
  open: boolean;
  id: string;
  label: string;
  children: ReactNode;
  /** Where it hangs: by default the box's whole width, just under it. */
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
            'absolute inset-x-0 top-full z-30 mt-2 flex max-h-[min(60vh,28rem)] flex-col gap-2.5 overflow-y-auto overscroll-contain rounded-md bg-pure-white px-3 py-2.5 text-left shadow-sm',
            className,
          )}
        >
          {children}
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}

/** A group of options; its title («Especialidades», «Lugares») for screen readers. */
export function SuggestionGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const titleId = useId();
  return (
    <div
      role="group"
      aria-labelledby={titleId}
      className="flex flex-col gap-2.5"
    >
      <div id={titleId} className="sr-only">
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
  icon: IconComponent;
  /** The icon's colour, by the row's kind (Figma: a person blue-300, a place the primary). */
  iconClassName?: string;
  children: ReactNode;
  /** A second, smaller line: a specialist's specialty. */
  description?: ReactNode;
  /** At the row's end: a button to forget a search. */
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
  iconClassName,
  children,
  description,
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
        // Compact with a mouse, as drawn; a full tap target on touch screens.
        'flex shrink-0 cursor-pointer items-center gap-2.5 rounded-sm px-2 py-1.5 text-body-xxs text-pure-black transition-colors duration-fast ease-house data-active:bg-blue-50 touch:min-h-touch',
        className,
      )}
    >
      <Icon
        icon={icon}
        size={16}
        className={cn('shrink-0 text-blue-300', iconClassName)}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate">{children}</span>
        {description ? (
          <span className="truncate text-body-xxxs text-text-secondary">
            {description}
          </span>
        ) : null}
      </span>
      {trailing}
    </div>
  );
}

/** Rows that stand for what is still on its way. */
export function SuggestionSkeletonRows({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-2.5">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-2.5 px-2 py-1.5">
          <Skeleton className="size-4 rounded-full" />
          <Skeleton className="h-3.5 w-2/3" />
        </div>
      ))}
    </div>
  );
}

/** A line with no options to offer. */
export function SuggestionNote({ children }: { children: ReactNode }) {
  return (
    <p className="px-2 py-1.5 text-body-xxs text-text-secondary">{children}</p>
  );
}
