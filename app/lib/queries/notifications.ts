import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';

import { notificationKeys } from './notification-keys';
import { apiFetch } from '../api/client';
import {
  clearedResponseSchema,
  deletedResponseSchema,
  heartbeatResponseSchema,
  inboxResponseSchema,
  notificationResponseSchema,
  readAllResponseSchema,
  toInbox,
  toNotification,
  type DeviceTokenBody,
  type Inbox,
  type InboxNotification,
} from '../schemas/notifications';

import type { TokenHolder } from '../api/types';

/*
 * The person's notifications (AGENTS.md §1, the inbox in the pilot since
 * 2026-10-14): the inbox and the count the bell shows, one read for both,
 * and what can be done with a notice — read, read all, delete, empty —,
 * all in the browser with the person's token (§4). The live channel that
 * tells when something new arrives is app/lib/notifications/socket.ts;
 * what the inbox looks like after each action, app/lib/notifications/inbox.ts.
 */

export { notificationKeys } from './notification-keys';

/** The API paginates nothing here: `limit` alone, 100 at most. The app asks for 50. */
export const INBOX_LIMIT = 50;

export async function readInbox(
  user: TokenHolder,
  signal?: AbortSignal,
): Promise<Inbox> {
  const inbox = await apiFetch({
    path: '/notifications/',
    query: { limit: INBOX_LIMIT },
    token: await user.getToken(),
    schema: inboxResponseSchema,
    ...(signal ? { signal } : {}),
  });
  return toInbox(inbox);
}

export function inboxQueryOptions(user: TokenHolder) {
  return queryOptions({
    queryKey: notificationKeys.inbox(user.id),
    queryFn: ({ signal }) => readInbox(user, signal),
    // The live channel keeps it current; a return to the tab reads it again.
    staleTime: 60_000,
  });
}

/**
 * `PATCH /notifications/{id}/read`. The one write that is not idempotent: a
 * notice already gone answers 404, which says the list is old, not the row.
 */
export async function markNotificationRead(
  user: TokenHolder,
  notificationId: string,
): Promise<InboxNotification> {
  return toNotification(
    await apiFetch({
      method: 'PATCH',
      path: '/notifications/:notificationId/read',
      params: { notificationId },
      token: await user.getToken(),
      schema: notificationResponseSchema,
      expected: (error) => error.status === 404,
    }),
  );
}

/** `PATCH /notifications/read-all`: how many were marked. */
export async function markAllNotificationsRead(
  user: TokenHolder,
): Promise<number> {
  const { updated } = await apiFetch({
    method: 'PATCH',
    path: '/notifications/read-all',
    token: await user.getToken(),
    schema: readAllResponseSchema,
  });
  return updated;
}

/** `DELETE /notifications/{id}`: idempotent, one already gone answers `false`. */
export async function deleteNotification(
  user: TokenHolder,
  notificationId: string,
): Promise<boolean> {
  const { deleted } = await apiFetch({
    method: 'DELETE',
    path: '/notifications/:notificationId',
    params: { notificationId },
    token: await user.getToken(),
    schema: deletedResponseSchema,
    idempotent: true,
  });
  return deleted;
}

/** `DELETE /notifications/`: empties the inbox, for good. */
export async function clearNotifications(user: TokenHolder): Promise<number> {
  const { deleted } = await apiFetch({
    method: 'DELETE',
    path: '/notifications/',
    token: await user.getToken(),
    schema: clearedResponseSchema,
    idempotent: true,
  });
  return deleted;
}

/*
 * The push: this browser registered as one of the person's devices
 * (app/lib/notifications/push.ts). The three calls are idempotent on the
 * API's side, so a lost answer may be retried.
 */

const noBody = z.undefined();

/** `POST /notifications/device-tokens`: registers, or reactivates, this browser's token. */
export async function registerDeviceToken(
  user: TokenHolder,
  body: DeviceTokenBody,
): Promise<void> {
  await apiFetch({
    method: 'POST',
    path: '/notifications/device-tokens',
    body,
    token: await user.getToken(),
    schema: noBody,
    idempotent: true,
  });
}

/** `DELETE /notifications/device-tokens`: before signing out, so no push follows the person. */
export async function unregisterDeviceToken(
  user: TokenHolder,
  deviceToken: string,
  signal?: AbortSignal,
): Promise<void> {
  await apiFetch({
    method: 'DELETE',
    path: '/notifications/device-tokens',
    body: { token: deviceToken },
    token: await user.getToken(),
    schema: noBody,
    idempotent: true,
    // Signing out cannot wait long for a slow server.
    timeoutMs: 4000,
    maxRetries: 0,
    ...(signal ? { signal } : {}),
  });
}

/**
 * `POST /notifications/device-tokens/heartbeat`: this browser is still in
 * use. `false` means the server no longer knows it as the person's (a
 * sign-out from afar, another person on the same device).
 */
export async function deviceHeartbeat(
  user: TokenHolder,
  deviceToken: string,
): Promise<boolean> {
  const { registered } = await apiFetch({
    method: 'POST',
    path: '/notifications/device-tokens/heartbeat',
    body: { token: deviceToken },
    token: await user.getToken(),
    schema: heartbeatResponseSchema,
    idempotent: true,
  });
  return registered;
}
