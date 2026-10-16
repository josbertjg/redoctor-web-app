// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  buildInboxResponse,
  buildNotificationResponse,
  cancelledNotificationId,
  reminderNotificationId,
  welcomeNotificationId,
} from '@/tests/factories/notifications';

import {
  withAllRead,
  withArrivedNotification,
  withNotificationsRead,
  withoutNotification,
  withRestoredNotification,
  withUnreadCount,
} from './inbox';
import {
  inboxResponseSchema,
  toInbox,
  toNotification,
  notificationResponseSchema,
} from '../schemas/notifications';

/** Three notices, the two first unread, the last one read. */
const inbox = () => toInbox(inboxResponseSchema.parse(buildInboxResponse()));

const readAt = '2026-10-14T21:00:00.000Z';

describe('withNotificationsRead', () => {
  it('reads the given notices and discounts the ones that were unread', () => {
    const next = withNotificationsRead(
      inbox(),
      [cancelledNotificationId],
      readAt,
    );

    expect(next.unreadCount).toBe(1);
    expect(next.notifications[0]).toMatchObject({ read: true, readAt });
    expect(next.notifications[1]?.read).toBe(false);
  });

  it('changes nothing for a notice already read', () => {
    const next = withNotificationsRead(
      inbox(),
      [welcomeNotificationId],
      readAt,
    );

    expect(next.unreadCount).toBe(2);
    expect(next.notifications[2]?.readAt).toBe('2026-10-13T16:00:00.000Z');
  });
});

describe('withAllRead', () => {
  it('reads every listed notice and leaves nothing unread, listed or not', () => {
    const next = withAllRead(withUnreadCount(inbox(), 5), readAt);

    expect(next.unreadCount).toBe(0);
    expect(next.notifications.every((item) => item.read)).toBe(true);
  });
});

describe('withoutNotification', () => {
  it('removes an unread notice and discounts it', () => {
    const next = withoutNotification(inbox(), reminderNotificationId);

    expect(next.notifications.map((item) => item.id)).toEqual([
      cancelledNotificationId,
      welcomeNotificationId,
    ]);
    expect(next.unreadCount).toBe(1);
  });

  it('removes a read notice without touching the count', () => {
    expect(
      withoutNotification(inbox(), welcomeNotificationId).unreadCount,
    ).toBe(2);
  });

  it('leaves the inbox as it is for an id it does not hold', () => {
    const current = inbox();
    expect(withoutNotification(current, 'nope')).toBe(current);
  });
});

describe('withRestoredNotification', () => {
  it('puts a notice back where it was and counts it again when unread', () => {
    const current = inbox();
    const removed = current.notifications[1];
    if (!removed) throw new Error('fixture');
    const without = withoutNotification(current, removed.id);

    const restored = withRestoredNotification(without, removed, 1);

    expect(restored.notifications.map((item) => item.id)).toEqual(
      current.notifications.map((item) => item.id),
    );
    expect(restored.unreadCount).toBe(2);
  });

  it('does not duplicate a notice that is already back', () => {
    const current = inbox();
    const first = current.notifications[0];
    if (!first) throw new Error('fixture');

    expect(withRestoredNotification(current, first, 0)).toBe(current);
  });

  it('clamps an index past the end', () => {
    const current = inbox();
    const removed = current.notifications[0];
    if (!removed) throw new Error('fixture');
    const restored = withRestoredNotification(
      withoutNotification(current, removed.id),
      removed,
      99,
    );

    expect(restored.notifications.at(-1)?.id).toBe(removed.id);
  });
});

describe('withArrivedNotification', () => {
  const arrived = toNotification(
    notificationResponseSchema.parse(
      buildNotificationResponse({ id: 'new-1', title: 'Nueva cita' }),
    ),
  );

  it('puts a new notice on top and counts it when the server sent no count', () => {
    const next = withArrivedNotification(inbox(), arrived, null);

    expect(next.notifications[0]?.id).toBe('new-1');
    expect(next.notifications).toHaveLength(4);
    expect(next.unreadCount).toBe(3);
  });

  it('takes the server count when it travelled', () => {
    expect(withArrivedNotification(inbox(), arrived, 7).unreadCount).toBe(7);
  });

  it('keeps the list when the notice is known already', () => {
    const current = inbox();
    const known = current.notifications[0];
    if (!known) throw new Error('fixture');

    const next = withArrivedNotification(current, known, null);

    expect(next.notifications).toHaveLength(3);
    expect(next.unreadCount).toBe(2);
  });
});

describe('withUnreadCount', () => {
  it('never goes below zero', () => {
    expect(withUnreadCount(inbox(), -3).unreadCount).toBe(0);
    expect(withUnreadCount(inbox(), 4).unreadCount).toBe(4);
  });
});
