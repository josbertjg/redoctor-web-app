'use client';

import ChevronRight from '@material-symbols/svg-400/rounded/chevron_right.svg?svgr';

import type { InboxNotification } from '@/app/lib/schemas/notifications';
import { cn } from '@/app/lib/utils';

import { Icon } from '@/app/ui/icons';
import { toast } from '@/app/ui/toast';

import { notificationTone } from './notification-tone';

/*
 * The notice seen inside the web when it arrives live, with the app's
 * banner: the family's icon, the title, two lines of the words and a
 * chevron, the whole card a button. It rides on the page's Toaster — at
 * the top, swiped away or left to go — so it stacks with any other notice
 * and is announced by the same live region. Four seconds, as the app's.
 */

export const BANNER_DURATION_MS = 4000;

type NotificationBannerProps = {
  notification: InboxNotification;
  onOpen: () => void;
};

export function NotificationBanner({
  notification,
  onOpen,
}: NotificationBannerProps) {
  const tone = notificationTone(notification.type);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="-m-1 flex w-full min-w-0 flex-1 cursor-pointer items-start gap-3 rounded-lg p-1 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full',
          tone.className,
        )}
      >
        <Icon icon={tone.icon} size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-label-lg text-text-primary">
          {notification.title}
        </span>
        <span className="mt-0.5 line-clamp-2 text-body-sm text-text-secondary">
          {notification.body}
        </span>
      </span>
      <Icon icon={ChevronRight} size={24} className="mt-1.5 text-grey-400" />
    </button>
  );
}

/** Shows the banner; a tap reads the notice and opens what it is about. */
export function showNotificationBanner(
  notification: InboxNotification,
  onOpen: (notification: InboxNotification) => void,
): void {
  const id = `notification-${notification.id}`;
  toast.custom(
    (toastId) => (
      <NotificationBanner
        notification={notification}
        onOpen={() => {
          toast.dismiss(toastId);
          onOpen(notification);
        }}
      />
    ),
    { id, duration: BANNER_DURATION_MS },
  );
}
