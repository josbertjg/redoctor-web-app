import { cn } from '@/app/lib/utils';

import { NotificationsBell } from '@/app/ui/notifications/notifications-bell';

import { SessionButton } from './session-button';

type SessionControlsProps = {
  /** Where to come back after signing in; the page's own path by default. */
  redirect?: string;
  /** `inverse` on the blue primary: the bell in white, white focus rings. */
  tone?: 'default' | 'inverse';
  /** Nothing for a stranger: on the sign-in and sign-up pages, signing in is the page. */
  hideSignIn?: boolean;
  className?: string;
};

/** The bell's own colours, overridden on blue (tailwind-merge keeps the last). */
const inverseBell =
  'text-white-50 hover:bg-white-50/15 focus-visible:ring-white-50/70 data-[state=open]:bg-white-50/15';
const inverseFocus = 'focus-visible:ring-white-50/70';

/**
 * The session's place in a bar, whole: the notifications' bell while
 * someone is signed in, then «Entrar» or the account with its menu
 * (AGENTS.md §9). The landing's and the search's bars compose the two by
 * hand, since they hide the account on phones.
 */
export function SessionControls({
  redirect,
  tone = 'default',
  hideSignIn = false,
  className,
}: SessionControlsProps) {
  const inverse = tone === 'inverse';
  return (
    <div className={cn('flex shrink-0 items-center gap-1 sm:gap-2', className)}>
      <NotificationsBell {...(inverse ? { className: inverseBell } : {})} />
      <SessionButton
        {...(redirect === undefined ? {} : { redirect })}
        hideSignIn={hideSignIn}
        {...(inverse ? { className: inverseFocus } : {})}
      />
    </div>
  );
}
