import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildNotificationResponse } from '@/tests/factories/notifications';

import {
  createNotificationsChannel,
  notificationsChannelUrl,
  type RealtimeEvent,
  type SocketFactory,
} from './socket';

/*
 * A stand-in for socket.io-client's socket: it records what the channel
 * asks of it and lets the test play the server (connect, events, drops).
 */
type Listener = (...args: unknown[]) => void;

function createFakeSocket() {
  const listeners = new Map<string, Listener[]>();
  const socket = {
    connected: false,
    connect: vi.fn(),
    disconnect: vi.fn(() => {
      socket.connected = false;
    }),
    on: vi.fn((event: string, listener: Listener) => {
      listeners.set(event, [...(listeners.get(event) ?? []), listener]);
      return socket;
    }),
    removeAllListeners: vi.fn(() => {
      listeners.clear();
      return socket;
    }),
    /** The server speaks. */
    receive(event: string, ...args: unknown[]) {
      for (const listener of listeners.get(event) ?? []) listener(...args);
    },
    /** The handshake went through. */
    open() {
      socket.connected = true;
      socket.receive('connect');
    },
    /** The server refused the token and hung up, as api-dev does. */
    refuse() {
      socket.receive('error', { message: 'Unauthorized: invalid token' });
      socket.connected = false;
      socket.receive('disconnect', 'io server disconnect');
    },
  };
  return socket;
}

type FakeSocket = ReturnType<typeof createFakeSocket>;

const url = 'https://api.test/ws/notifications';

function setUp(tokens: (string | null)[] = ['token-1', 'token-2', 'token-3']) {
  const sockets: FakeSocket[] = [];
  const options: Record<string, unknown>[] = [];
  const io = vi.fn((_url: string, given: Record<string, unknown>) => {
    const socket = createFakeSocket();
    sockets.push(socket);
    options.push(given);
    return socket;
  });
  let attempt = 0;
  const getToken = vi.fn(() => Promise.resolve(tokens[attempt++] ?? null));
  const onEvent = vi.fn<(event: RealtimeEvent) => void>();
  const onStatus = vi.fn<(connected: boolean) => void>();
  const channel = createNotificationsChannel({
    url,
    getToken,
    onEvent,
    onStatus,
    loadSocketFactory: () => Promise.resolve(io as unknown as SocketFactory),
    initialRetryMs: 2000,
    maxRetryMs: 8000,
  });
  return { channel, sockets, options, io, getToken, onEvent, onStatus };
}

/** Lets the token and the library arrive, and the drop be handled. */
const settle = () => vi.advanceTimersByTimeAsync(0);

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('notificationsChannelUrl', () => {
  it('hangs the namespace from the API host, not from /api/v1', () => {
    expect(
      notificationsChannelUrl('https://api-dev.redoctorapp.com/api/v1'),
    ).toBe('https://api-dev.redoctorapp.com/ws/notifications');
  });
});

describe('createNotificationsChannel', () => {
  it('connects over websocket with a fresh token and no reconnection of its own', async () => {
    const { channel, sockets, options, io, onStatus } = setUp();

    channel.connect();
    await settle();

    expect(io).toHaveBeenCalledWith(url, expect.anything());
    expect(options[0]).toMatchObject({
      transports: ['websocket'],
      autoConnect: false,
      reconnection: false,
      forceNew: true,
      auth: { token: 'token-1' },
    });
    expect(sockets[0]?.connect).toHaveBeenCalledOnce();
    expect(channel.isConnected()).toBe(false);

    sockets[0]?.open();
    expect(channel.isConnected()).toBe(true);
    expect(onStatus).toHaveBeenCalledWith(true);
  });

  it('hands over the created notices and the unread count, and ignores what it cannot read', async () => {
    const { channel, sockets, onEvent } = setUp();
    channel.connect();
    await settle();
    sockets[0]?.open();

    sockets[0]?.receive('notification:created', {
      notification: buildNotificationResponse({ id: 'new-1' }),
      unreadCount: 2,
    });
    sockets[0]?.receive('notification:unread', { unreadCount: 0 });
    sockets[0]?.receive('notification:created', { nothing: true });
    sockets[0]?.receive('notification:unread', 'four');

    expect(onEvent).toHaveBeenCalledTimes(2);
    expect(onEvent.mock.calls[0]?.[0]).toMatchObject({
      kind: 'created',
      notification: { id: 'new-1', read: false },
      unreadCount: 2,
    });
    expect(onEvent.mock.calls[1]?.[0]).toEqual({
      kind: 'unread',
      unreadCount: 0,
    });
  });

  it('retries a drop by the server with a fresh token, two seconds then doubling', async () => {
    const { channel, sockets, options, io, onStatus } = setUp();
    channel.connect();
    await settle();
    sockets[0]?.open();

    sockets[0]?.refuse();
    await settle();

    expect(sockets[0]?.removeAllListeners).toHaveBeenCalledOnce();
    expect(sockets[0]?.disconnect).toHaveBeenCalledOnce();
    expect(onStatus).toHaveBeenLastCalledWith(false);
    expect(channel.isConnected()).toBe(false);

    await vi.advanceTimersByTimeAsync(1999);
    expect(io).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(io).toHaveBeenCalledTimes(2);
    expect(options[1]).toMatchObject({ auth: { token: 'token-2' } });

    // Refused again: the wait doubles.
    sockets[1]?.refuse();
    await settle();
    await vi.advanceTimersByTimeAsync(3999);
    expect(io).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(io).toHaveBeenCalledTimes(3);
    expect(options[2]).toMatchObject({ auth: { token: 'token-3' } });
  });

  it('retries at once on an explicit connect, whatever the wait was', async () => {
    const { channel, sockets, io } = setUp();
    channel.connect();
    await settle();
    sockets[0]?.refuse();
    await settle();

    channel.connect();
    await settle();

    expect(io).toHaveBeenCalledTimes(2);
  });

  it('never opens two sockets for two calls while an attempt is on its way', async () => {
    const { channel, io } = setUp();

    channel.connect();
    channel.connect();
    await settle();

    expect(io).toHaveBeenCalledTimes(1);
  });

  it('waits for a token when there is none yet', async () => {
    const { channel, io } = setUp([null, 'token-late']);

    channel.connect();
    await settle();
    expect(io).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(2000);
    expect(io).toHaveBeenCalledTimes(1);
  });

  it('stops retrying once disconnected, and does nothing once disposed', async () => {
    const { channel, sockets, io } = setUp();
    channel.connect();
    await settle();
    sockets[0]?.open();

    channel.disconnect();
    expect(sockets[0]?.disconnect).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(io).toHaveBeenCalledTimes(1);

    channel.dispose();
    channel.connect();
    await settle();
    expect(io).toHaveBeenCalledTimes(1);
  });

  it('lets a session that left while the token was on its way go', async () => {
    const { channel, io } = setUp();

    channel.connect();
    channel.disconnect();
    await settle();

    expect(io).not.toHaveBeenCalled();
  });
});
