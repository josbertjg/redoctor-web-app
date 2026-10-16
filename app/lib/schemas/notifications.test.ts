// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  buildInboxResponse,
  buildNotificationResponse,
} from '@/tests/factories/notifications';

import {
  inboxResponseSchema,
  notificationCreatedPayloadSchema,
  notificationResponseSchema,
  toInbox,
  toNotification,
  unreadCountPayloadSchema,
} from './notifications';

describe('the inbox contract', () => {
  it('reads the inbox as the API lists it, the unread told by readAt', () => {
    const inbox = toInbox(inboxResponseSchema.parse(buildInboxResponse()));

    expect(inbox.unreadCount).toBe(2);
    expect(inbox.notifications.map((item) => item.read)).toEqual([
      false,
      false,
      true,
    ]);
    expect(inbox.notifications[0]?.data).toEqual({
      kind: 'APPOINTMENT_CANCELLED_PATIENT',
      appointmentId: 'appt-1',
    });
    expect(inbox.notifications[0]?.type).toBe('APPOINTMENT');
    expect(inbox.notifications[2]?.readAt).toBe('2026-10-13T16:00:00.000Z');
    expect(inbox.notifications[2]?.createdAt).toBe('2026-10-13T15:00:00.000Z');
  });

  it('takes a type it does not know for a system notice, and no data for none', () => {
    const notification = toNotification(
      notificationResponseSchema.parse({
        ...buildNotificationResponse(),
        type: 'SOMETHING_NEW',
        data: null,
      }),
    );

    expect(notification.type).toBe('SYSTEM');
    expect(notification.data).toEqual({});
  });

  it('reads the instants as they come and keeps nothing that is not a date', () => {
    const notification = toNotification(
      notificationResponseSchema.parse({
        ...buildNotificationResponse(),
        readAt: 'not a date',
        createdAt: Date.UTC(2026, 9, 14, 20),
      }),
    );

    // Set by the API, so read, even if it cannot be shown as a date.
    expect(notification.read).toBe(true);
    expect(notification.readAt).toBeNull();
    expect(notification.createdAt).toBe('2026-10-14T20:00:00.000Z');
  });

  it('reads the values of the payload as strings whatever they came as', () => {
    const notification = toNotification(
      notificationResponseSchema.parse({
        ...buildNotificationResponse(),
        data: { kind: 'BILLING_INVOICE_DUE', attempts: 2 },
      }),
    );

    expect(notification.data).toEqual({
      kind: 'BILLING_INVOICE_DUE',
      attempts: '2',
    });
  });

  it('never takes a negative count', () => {
    expect(
      toInbox(inboxResponseSchema.parse(buildInboxResponse([], -1)))
        .unreadCount,
    ).toBe(0);
  });
});

describe('the live channel payloads', () => {
  it('reads a created notice with the server count, or without it', () => {
    const withCount = notificationCreatedPayloadSchema.parse({
      notification: buildNotificationResponse(),
      unreadCount: 3,
    });
    expect(withCount.unreadCount).toBe(3);

    const withoutCount = notificationCreatedPayloadSchema.parse({
      notification: buildNotificationResponse(),
    });
    expect(withoutCount.unreadCount).toBeUndefined();

    expect(notificationCreatedPayloadSchema.safeParse({}).success).toBe(false);
  });

  it('reads the unread count, even written as text', () => {
    expect(unreadCountPayloadSchema.parse({ unreadCount: '4' })).toEqual({
      unreadCount: 4,
    });
    expect(unreadCountPayloadSchema.safeParse({}).success).toBe(false);
  });
});
