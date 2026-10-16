import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { apiUrl, errorEnvelope } from '@/tests/msw/api-url';
import { validToken } from '@/tests/msw/handlers/identity';
import { server } from '@/tests/msw/server';

import {
  clearNotifications,
  deleteNotification,
  deviceHeartbeat,
  INBOX_LIMIT,
  markAllNotificationsRead,
  markNotificationRead,
  readInbox,
  registerDeviceToken,
  unregisterDeviceToken,
} from './notifications';
import { isApiError } from '../api/errors';

const user = { id: 'uid-1', getToken: () => Promise.resolve(validToken) };

describe('readInbox', () => {
  it('reads the inbox with the limit the app uses and the bearer of the person', async () => {
    const seen = vi.fn<(limit: string | null, bearer: string | null) => void>();
    server.use(
      http.get(apiUrl('/notifications/'), ({ request }) => {
        seen(
          new URL(request.url).searchParams.get('limit'),
          request.headers.get('authorization'),
        );
        return HttpResponse.json({ notifications: [], unreadCount: 0 });
      }),
    );

    const inbox = await readInbox(user);

    expect(inbox).toEqual({ notifications: [], unreadCount: 0 });
    expect(seen).toHaveBeenCalledWith(
      String(INBOX_LIMIT),
      `Bearer ${validToken}`,
    );
  });

  it('hands the inbox over as the web reads it', async () => {
    const inbox = await readInbox(user);

    expect(inbox.unreadCount).toBe(2);
    expect(inbox.notifications).toHaveLength(3);
    expect(inbox.notifications[0]).toMatchObject({
      title: 'Cita cancelada',
      read: false,
      type: 'APPOINTMENT',
    });
  });
});

describe('the writes', () => {
  it('marks one notice read and gets it back read', async () => {
    const notification = await markNotificationRead(user, 'n-1');

    expect(notification).toMatchObject({
      id: 'n-1',
      read: true,
      readAt: '2026-10-14T21:00:00.000Z',
    });
  });

  it('says so when the notice to read is gone', async () => {
    server.use(
      http.patch(apiUrl('/notifications/:notificationId/read'), () =>
        HttpResponse.json(errorEnvelope('ERR_8001', 'Not found'), {
          status: 404,
        }),
      ),
    );

    await expect(markNotificationRead(user, 'gone')).rejects.toSatisfy(
      (error: unknown) => isApiError(error) && error.status === 404,
    );
  });

  it('marks all read, deletes one and empties the inbox', async () => {
    await expect(markAllNotificationsRead(user)).resolves.toBe(2);
    await expect(deleteNotification(user, 'n-1')).resolves.toBe(true);
    await expect(clearNotifications(user)).resolves.toBe(3);
  });
});

describe('the device of the push', () => {
  it('registers this browser, beats and unregisters with the device token', async () => {
    const bodies: unknown[] = [];
    server.use(
      http.post(apiUrl('/notifications/device-tokens'), async ({ request }) => {
        bodies.push(await request.json());
        return new HttpResponse(null, { status: 204 });
      }),
      http.delete(
        apiUrl('/notifications/device-tokens'),
        async ({ request }) => {
          bodies.push(await request.json());
          return new HttpResponse(null, { status: 204 });
        },
      ),
      http.post(
        apiUrl('/notifications/device-tokens/heartbeat'),
        async ({ request }) => {
          bodies.push(await request.json());
          return HttpResponse.json({ registered: false });
        },
      ),
    );

    await registerDeviceToken(user, {
      token: 'fcm-token',
      platform: 'WEB',
      deviceId: 'device-12345678',
      deviceName: 'Chrome · macOS',
      appVersion: '0.31.0',
    });
    await expect(deviceHeartbeat(user, 'fcm-token')).resolves.toBe(false);
    await unregisterDeviceToken(user, 'fcm-token');

    expect(bodies).toEqual([
      {
        token: 'fcm-token',
        platform: 'WEB',
        deviceId: 'device-12345678',
        deviceName: 'Chrome · macOS',
        appVersion: '0.31.0',
      },
      { token: 'fcm-token' },
      { token: 'fcm-token' },
    ]);
  });
});
