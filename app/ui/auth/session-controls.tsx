import { cn } from '@/app/lib/utils';

import { NotificationsBell } from '@/app/ui/notifications/notifications-bell';

import { SessionButton } from './session-button';

type SessionControlsProps = {
  /** Where to come back after signing in; the page's own path by default. */
  redirect?: string;
  className?: string;
};

/**
 * The session's place in a bar, whole: the notifications' bell while
 * someone is signed in, then «Entrar» or the account with its menu
 * (AGENTS.md §9). The landing's and the search's bars compose the two by
 * hand, since they hide the account on phones.
 */
export function SessionControls({ redirect, className }: SessionControlsProps) {
  return (
    <div className={cn('flex shrink-0 items-center gap-1 sm:gap-2', className)}>
      <NotificationsBell />
      <SessionButton {...(redirect === undefined ? {} : { redirect })} />
    </div>
  );
}
