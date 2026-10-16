import type { Inbox, InboxNotification } from '../schemas/notifications';

/*
 * What the inbox looks like after each thing that happens to it, so the
 * bell and the list move at once and the API is told after (the app's
 * optimistic marks). Pure functions over the cached inbox; the provider
 * applies them (app/ui/notifications/notifications-provider.tsx). No zod
 * here: this travels with every page, the contract only with the reader.
 */

export const emptyInbox: Inbox = { notifications: [], unreadCount: 0 };

/**
 * The count is the person's, not the list's — there can be more unread
 * than the inbox lists —, so it is discounted, never recounted.
 */
const decreased = (count: number, by: number) => Math.max(0, count - by);

/** The given notices read now; the count moves by the ones that were unread. */
export function withNotificationsRead(
  inbox: Inbox,
  ids: readonly string[],
  readAt: string,
): Inbox {
  const targets = new Set(ids);
  let newlyRead = 0;
  const notifications = inbox.notifications.map((notification) => {
    if (!targets.has(notification.id) || notification.read) return notification;
    newlyRead += 1;
    return { ...notification, read: true, readAt };
  });
  return {
    notifications,
    unreadCount: decreased(inbox.unreadCount, newlyRead),
  };
}

/** Every listed notice read and nothing left unread, listed or not. */
export function withAllRead(inbox: Inbox, readAt: string): Inbox {
  return {
    ...withNotificationsRead(
      inbox,
      inbox.notifications.map((notification) => notification.id),
      readAt,
    ),
    unreadCount: 0,
  };
}

export function withoutNotification(inbox: Inbox, id: string): Inbox {
  const removed = inbox.notifications.find(
    (notification) => notification.id === id,
  );
  if (removed === undefined) return inbox;
  return {
    notifications: inbox.notifications.filter(
      (notification) => notification.id !== id,
    ),
    unreadCount: removed.read
      ? inbox.unreadCount
      : decreased(inbox.unreadCount, 1),
  };
}

/**
 * A notice back where it was after a delete the API refused. Put back into
 * the list as it is now, not the one of before: another may have gone
 * meanwhile, and the whole old list would bring it back.
 */
export function withRestoredNotification(
  inbox: Inbox,
  notification: InboxNotification,
  index: number,
): Inbox {
  if (inbox.notifications.some((other) => other.id === notification.id)) {
    return inbox;
  }
  const notifications = [...inbox.notifications];
  notifications.splice(
    Math.min(Math.max(index, 0), notifications.length),
    0,
    notification,
  );
  return {
    notifications,
    unreadCount: notification.read ? inbox.unreadCount : inbox.unreadCount + 1,
  };
}

/**
 * A notice that just arrived goes on top, where the API puts it. The same
 * one can come through the channel and in a reload that crossed it: known
 * already, the list stays. The server's count wins when it travelled.
 */
export function withArrivedNotification(
  inbox: Inbox,
  notification: InboxNotification,
  unreadCount: number | null,
): Inbox {
  const known = inbox.notifications.some(
    (other) => other.id === notification.id,
  );
  return {
    notifications: known
      ? inbox.notifications
      : [notification, ...inbox.notifications],
    unreadCount:
      unreadCount ??
      (known || notification.read ? inbox.unreadCount : inbox.unreadCount + 1),
  };
}

export function withUnreadCount(inbox: Inbox, unreadCount: number): Inbox {
  return { ...inbox, unreadCount: Math.max(0, unreadCount) };
}
