import 'client-only';

import {
  notificationCreatedPayloadSchema,
  toNotification,
  unreadCountPayloadSchema,
  type InboxNotification,
} from '../schemas/notifications';

import type { ManagerOptions, Socket, SocketOptions } from 'socket.io-client';

/*
 * The live channel of the notifications: the API's Socket.IO namespace
 * `/ws/notifications`, which hangs from the API's host and not from
 * `/api/v1` (the app's `NotificationsSocketService`). It pushes two things
 * while someone is signed in — a notice just created, and the unread count
 * when it moves, maybe from another device —; the inbox itself keeps coming
 * from the GET, since the channel holds nothing of what happened while it
 * was down.
 *
 * The reconnection is ours and not Socket.IO's, for two reasons measured
 * against api-dev (2026-10-14): the server accepts the connection and only
 * then checks the token — a bad one gets an `error` event and a disconnect
 * by the server, which Socket.IO never retries by itself —, and the ID
 * token expires in an hour, so each attempt must ask Firebase for a fresh
 * one. Two seconds, doubling up to a minute; an explicit `connect` (the tab
 * back in view, the network back) retries at once.
 *
 * Loaded on demand by the provider, with the first signed-in page:
 * socket.io-client (≈13 KB gzip) never travels with the landing.
 */

export type RealtimeEvent =
  | {
      kind: 'created';
      notification: InboxNotification;
      /** The server's unread total, when it travelled in the payload. */
      unreadCount: number | null;
    }
  | { kind: 'unread'; unreadCount: number };

/** How a socket is made: `io` of socket.io-client, or a fake in the tests. */
export type SocketFactory = (
  url: string,
  options: Partial<ManagerOptions & SocketOptions>,
) => Socket;

export type NotificationsChannelOptions = {
  url: string;
  /** A fresh ID token for each attempt; `null` without a session. */
  getToken: () => Promise<string | null>;
  onEvent: (event: RealtimeEvent) => void;
  /** The channel came up (after a drop too) or went down. */
  onStatus?: ((connected: boolean) => void) | undefined;
  /** Where `io` comes from; by default the library loads with the first connection. */
  loadSocketFactory?: (() => Promise<SocketFactory>) | undefined;
  initialRetryMs?: number | undefined;
  maxRetryMs?: number | undefined;
};

export type NotificationsChannel = {
  /** Wants the channel up: connects now and keeps retrying while it is wanted. */
  connect: () => void;
  /** Wants it down: a drop we asked for is never retried. */
  disconnect: () => void;
  dispose: () => void;
  isConnected: () => boolean;
};

export const CHANNEL_NAMESPACE = '/ws/notifications';

export const INITIAL_RETRY_MS = 2000;
export const MAX_RETRY_MS = 60_000;

/** `https://api-dev.redoctorapp.com/api/v1` → `https://api-dev.redoctorapp.com/ws/notifications`. */
export function notificationsChannelUrl(apiUrl: string): string {
  return `${new URL(apiUrl).origin}${CHANNEL_NAMESPACE}`;
}

const loadSocketIo = async (): Promise<SocketFactory> =>
  (await import('socket.io-client')).io;

export function createNotificationsChannel(
  options: NotificationsChannelOptions,
): NotificationsChannel {
  const loadFactory = options.loadSocketFactory ?? loadSocketIo;
  const initialRetry = options.initialRetryMs ?? INITIAL_RETRY_MS;
  const maxRetry = options.maxRetryMs ?? MAX_RETRY_MS;

  let socket: Socket | null = null;
  /** The session wants the channel: a drop is retried, the disconnect we asked for is not. */
  let wanted = false;
  /** An attempt is on its way — the token comes asynchronously —: a second call must not open a second socket. */
  let connecting = false;
  /** A drop is already being handled this turn (the server's `error` and its disconnect come together). */
  let dropping = false;
  /**
   * The channel was announced up and not yet down. Socket.IO clears
   * `connected` before telling of a disconnect, so the socket itself
   * cannot say whether there was a connection to announce the end of.
   */
  let announced = false;
  let disposed = false;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let retryDelay = initialRetry;

  /** Nobody wants the channel any more, or it is gone for good: an attempt stops here. */
  const abandoned = () => disposed || !wanted;

  const clearRetry = () => {
    if (retryTimer === undefined) return;
    clearTimeout(retryTimer);
    retryTimer = undefined;
  };

  const scheduleRetry = () => {
    if (abandoned()) return;
    clearRetry();
    retryTimer = setTimeout(() => {
      retryTimer = undefined;
      void open();
    }, retryDelay);
    retryDelay = Math.min(retryDelay * 2, maxRetry);
  };

  const teardown = () => {
    const current = socket;
    socket = null;
    connecting = false;
    if (current === null) return;
    current.removeAllListeners();
    current.disconnect();
    if (announced) {
      announced = false;
      options.onStatus?.(false);
    }
  };

  /*
   * A drop arrives from a listener of the socket itself: it is torn down a
   * turn later, not while its listeners are being walked.
   */
  const handleDrop = () => {
    if (dropping) return;
    dropping = true;
    queueMicrotask(() => {
      dropping = false;
      teardown();
      if (wanted) scheduleRetry();
    });
  };

  const emitCreated = (payload: unknown) => {
    const parsed = notificationCreatedPayloadSchema.safeParse(payload);
    if (!parsed.success) return;
    options.onEvent({
      kind: 'created',
      notification: toNotification(parsed.data.notification),
      unreadCount: parsed.data.unreadCount ?? null,
    });
  };

  const emitUnread = (payload: unknown) => {
    const parsed = unreadCountPayloadSchema.safeParse(payload);
    if (!parsed.success) return;
    options.onEvent({ kind: 'unread', unreadCount: parsed.data.unreadCount });
  };

  async function open(): Promise<void> {
    if (abandoned() || connecting || socket !== null) return;
    connecting = true;

    let token: string | null = null;
    let io: SocketFactory | null = null;
    try {
      [token, io] = await Promise.all([options.getToken(), loadFactory()]);
    } catch {
      // No token to offer, or the library did not load: tried again later.
    }

    // The session may have left while the token was on its way.
    if (abandoned()) {
      connecting = false;
      return;
    }
    if (token === null || io === null) {
      connecting = false;
      scheduleRetry();
      return;
    }

    const next = io(options.url, {
      transports: ['websocket'],
      autoConnect: false,
      reconnection: false,
      forceNew: true,
      auth: { token },
    });
    next.on('connect', () => {
      retryDelay = initialRetry;
      announced = true;
      options.onStatus?.(true);
    });
    next.on('disconnect', handleDrop);
    next.on('connect_error', handleDrop);
    // The server refuses a token with an `error` event, then disconnects.
    next.on('error', handleDrop);
    next.on('notification:created', emitCreated);
    next.on('notification:unread', emitUnread);

    socket = next;
    connecting = false;
    next.connect();
  }

  const disconnect = () => {
    wanted = false;
    clearRetry();
    retryDelay = initialRetry;
    teardown();
  };

  return {
    connect() {
      if (disposed) return;
      wanted = true;
      // An explicit connect says there may be network now: no waiting for
      // the backoff that piled up.
      clearRetry();
      retryDelay = initialRetry;
      void open();
    },
    disconnect,
    dispose() {
      disposed = true;
      disconnect();
    },
    isConnected: () => socket?.connected ?? false,
  };
}
