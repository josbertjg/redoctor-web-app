import { createContext, useContext } from 'react';

import type { Inbox, InboxNotification } from '@/app/lib/schemas/notifications';

/*
 * The person's notifications as every client component sees them: the
 * inbox and its unread count — kept current by the GET and the live
 * channel in app/ui/notifications/notifications-provider.tsx — and what
 * can be done with a notice. Without the provider (a tree rendered on its
 * own, a test) there are none.
 */

export type InboxStatus = 'idle' | 'loading' | 'ready' | 'error';

/**
 * Where the web push stands in this browser: `off` without the VAPID key,
 * `unsupported` where the browser cannot (Safari on iOS outside a web app
 * added to the home screen), then the browser's answer — not asked yet,
 * refused, or given —, and `enabling` while it is being asked.
 */
export type PushStatus =
  'off' | 'unsupported' | 'default' | 'denied' | 'granted' | 'enabling';

/** Whether to offer the push: for the first time, or again after a notice just arrived with it off. */
export type PushInvite = 'none' | 'first' | 'reminder';

export type Push = {
  status: PushStatus;
  invite: PushInvite;
  /**
   * Asks the browser and, allowed, registers this one among the person's
   * devices; settles once the browser has answered.
   */
  enable: () => Promise<void>;
  /** «Ahora no»: remembered, so the next visit does not ask again. */
  dismiss: () => void;
};

export const noPush: Push = {
  status: 'off',
  invite: 'none',
  enable: () => Promise.resolve(),
  dismiss: () => undefined,
};

export type Notifications = {
  /** Someone is signed in with an account that has an inbox. */
  enabled: boolean;
  status: InboxStatus;
  inbox: Inbox | null;
  unreadCount: number;
  /** The inbox is being read again: a retry, a return to the tab. */
  refreshing: boolean;
  /** The live channel is up. */
  live: boolean;
  /** The bell's menu is open: a notice arriving then is a row, not a banner. */
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  retry: () => void;
  /** Reads a notice and, when it leads somewhere, goes there. */
  open: (notification: InboxNotification) => void;
  markAllRead: () => void;
  remove: (notification: InboxNotification) => void;
  /** Empties the inbox for good; resolves to whether the API did. */
  clear: () => Promise<boolean>;
  /** The web push in this browser (app/ui/notifications/use-push.ts). */
  push: Push;
};

export const noNotifications: Notifications = {
  enabled: false,
  status: 'idle',
  inbox: null,
  unreadCount: 0,
  refreshing: false,
  live: false,
  menuOpen: false,
  setMenuOpen: () => undefined,
  retry: () => undefined,
  open: () => undefined,
  markAllRead: () => undefined,
  remove: () => undefined,
  clear: () => Promise.resolve(false),
  push: noPush,
};

export const NotificationsContext =
  createContext<Notifications>(noNotifications);

export function useNotifications(): Notifications {
  return useContext(NotificationsContext);
}
