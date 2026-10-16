import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  NotificationsChannelOptions,
  RealtimeEvent,
} from '@/app/lib/notifications/socket';
import type { publicEnv } from '@/app/lib/public-env';
import { meResponseSchema, toAccount } from '@/app/lib/schemas/identity';
import {
  notificationResponseSchema,
  toNotification,
} from '@/app/lib/schemas/notifications';

import { buildMeResponse } from '@/tests/factories/identity';
import { buildNotificationResponse } from '@/tests/factories/notifications';
import { apiUrl } from '@/tests/msw/api-url';
import { validToken } from '@/tests/msw/handlers/identity';
import { server } from '@/tests/msw/server';
import { renderWithIntl } from '@/tests/render';

import {
  noSession,
  SessionContext,
  type Session,
  type SignOutTask,
} from '@/app/hooks/use-session';

import { NotificationsBell } from './notifications-bell';
import { NotificationsProvider } from './notifications-provider';
import { Toaster } from '../toast';

/*
 * The web push, through the provider and the menu, with the VAPID key set:
 * the invitation, the browser's answer, the device registered, the
 * heartbeat and the sign-out from afar. Firebase Messaging and the browser's
 * Notification API are stand-ins; the API is MSW.
 */

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/app/lib/public-env', async (importOriginal) => {
  const original = await importOriginal<{ publicEnv: typeof publicEnv }>();
  return {
    publicEnv: {
      ...original.publicEnv,
      firebase: { ...original.publicEnv.firebase, vapidKey: 'test-vapid-key' },
    },
  };
});

const messaging = vi.hoisted(() => ({
  supported: true,
  getPushToken: vi.fn(() => Promise.resolve('fcm-token-1')),
  deletePushToken: vi.fn(() => Promise.resolve()),
}));
vi.mock('@/app/lib/firebase/messaging', () => ({
  isPushSupported: () => Promise.resolve(messaging.supported),
  getPushToken: messaging.getPushToken,
  deletePushToken: messaging.deletePushToken,
}));

type FakeChannel = { options: NotificationsChannelOptions };
const channels = vi.hoisted(() => ({ made: [] as FakeChannel[] }));
vi.mock('@/app/lib/notifications/socket', () => ({
  notificationsChannelUrl: (apiUrl: string) => `${apiUrl}/ws/notifications`,
  createNotificationsChannel: (options: NotificationsChannelOptions) => {
    channels.made.push({ options });
    return {
      connect: vi.fn(),
      disconnect: vi.fn(),
      dispose: vi.fn(),
      isConnected: () => false,
    };
  },
}));

/** The browser's Notification API, as the test needs it to answer. */
const browser = {
  permission: 'default' as NotificationPermission,
  requestPermission: vi.fn<() => Promise<NotificationPermission>>(),
};

const user = {
  id: 'uid-1',
  email: 'ana@example.com',
  name: 'Ana Pérez',
  photo: null,
  provider: 'google' as const,
  getToken: () => Promise.resolve(validToken),
};

const patient = toAccount(meResponseSchema.parse(buildMeResponse()));

function renderSignedIn() {
  const signOutTasks: SignOutTask[] = [];
  const session: Session = {
    ...noSession,
    status: 'signed-in',
    user,
    account: patient,
    accountStatus: 'ready',
    signOut: vi.fn(() => Promise.resolve()),
    addSignOutTask: (task) => {
      signOutTasks.push(task);
      return () => undefined;
    },
  };
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  renderWithIntl(
    <QueryClientProvider client={client}>
      <SessionContext.Provider value={session}>
        <NotificationsProvider
          notices={{
            actionFailed: 'No pudimos actualizar tus notificaciones.',
            sessionClosedRemotely: 'Tu sesión se cerró desde otro dispositivo',
          }}
          appVersion="0.31.0"
        >
          <NotificationsBell />
          <Toaster regionLabel="Avisos" closeLabel="Cerrar" />
        </NotificationsProvider>
      </SessionContext.Provider>
    </QueryClientProvider>,
  );
  return { session, signOutTasks };
}

async function openMenu() {
  await userEvent.click(
    await screen.findByRole('button', { name: /^Notificaciones/ }),
  );
  const menu = await screen.findByRole('dialog', { name: 'Notificaciones' });
  await within(menu).findByRole('heading', { name: 'Notificaciones' });
  return menu;
}

/** What the API was told about this browser. */
function listenToDevices() {
  const registered: unknown[] = [];
  const beats: unknown[] = [];
  const dropped: unknown[] = [];
  let registeredAnswer = true;
  server.use(
    http.post(apiUrl('/notifications/device-tokens'), async ({ request }) => {
      registered.push(await request.json());
      return new HttpResponse(null, { status: 204 });
    }),
    http.post(
      apiUrl('/notifications/device-tokens/heartbeat'),
      async ({ request }) => {
        beats.push(await request.json());
        return HttpResponse.json({ registered: registeredAnswer });
      },
    ),
    http.delete(apiUrl('/notifications/device-tokens'), async ({ request }) => {
      dropped.push(await request.json());
      return new HttpResponse(null, { status: 204 });
    }),
  );
  return {
    registered,
    beats,
    dropped,
    revoke: () => {
      registeredAnswer = false;
    },
  };
}

beforeEach(() => {
  browser.permission = 'default';
  browser.requestPermission.mockReset();
  vi.stubGlobal('Notification', browser);
  messaging.supported = true;
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
  channels.made.length = 0;
});

describe('the web push', () => {
  it('offers to turn it on, and remembers «Ahora no»', async () => {
    renderSignedIn();
    const menu = await openMenu();

    expect(
      await within(menu).findByText('Activa las notificaciones'),
    ).toBeInTheDocument();
    await userEvent.click(
      within(menu).getByRole('button', { name: 'Ahora no' }),
    );

    expect(
      within(menu).queryByText('Activa las notificaciones'),
    ).not.toBeInTheDocument();
    expect(window.localStorage.getItem('redoctor-push-declined')).toBe('1');
  });

  it('registers this browser once the person allows it', async () => {
    const devices = listenToDevices();
    browser.requestPermission.mockResolvedValue('granted');
    renderSignedIn();
    const menu = await openMenu();

    await userEvent.click(
      await within(menu).findByRole('button', { name: 'Activar' }),
    );

    await waitFor(() => {
      expect(devices.registered).toHaveLength(1);
    });
    expect(devices.registered[0]).toMatchObject({
      token: 'fcm-token-1',
      platform: 'WEB',
      appVersion: '0.31.0',
    });
    expect(devices.registered[0]).toHaveProperty('deviceId');
    expect(devices.registered[0]).toHaveProperty('deviceName');
    expect(messaging.getPushToken).toHaveBeenCalledWith('test-vapid-key');
    expect(
      within(menu).queryByText('Activa las notificaciones'),
    ).not.toBeInTheDocument();
    expect(
      JSON.parse(
        window.localStorage.getItem('redoctor-push-registration') ?? 'null',
      ),
    ).toEqual({ userId: 'uid-1', token: 'fcm-token-1' });
    // The first heartbeat goes with the registration.
    await waitFor(() => {
      expect(devices.beats).toEqual([{ token: 'fcm-token-1' }]);
    });
  });

  it('says so when the browser refuses', async () => {
    browser.requestPermission.mockResolvedValue('denied');
    renderSignedIn();
    const menu = await openMenu();

    await userEvent.click(
      await within(menu).findByRole('button', { name: 'Activar' }),
    );

    expect(
      await within(menu).findByText(/bloqueadas en este navegador/),
    ).toBeInTheDocument();
  });

  it('registers without asking when the permission was given before, and signs out when the server no longer knows this browser', async () => {
    const devices = listenToDevices();
    devices.revoke();
    browser.permission = 'granted';
    window.localStorage.setItem(
      'redoctor-push-registration',
      JSON.stringify({ userId: 'uid-1', token: 'fcm-token-1' }),
    );
    const { session } = renderSignedIn();
    await screen.findByRole('button', { name: /^Notificaciones/ });

    await waitFor(() => {
      expect(devices.registered).toHaveLength(1);
    });
    await waitFor(() => {
      expect(devices.beats).toHaveLength(1);
    });
    expect(
      await screen.findByText('Tu sesión se cerró desde otro dispositivo'),
    ).toBeInTheDocument();
    expect(session.signOut).toHaveBeenCalledWith('revoked');
  });

  it('drops the device before the session ends, with the token still valid', async () => {
    const devices = listenToDevices();
    browser.permission = 'granted';
    const { signOutTasks } = renderSignedIn();
    await screen.findByRole('button', { name: /^Notificaciones/ });
    await waitFor(() => {
      expect(devices.registered).toHaveLength(1);
    });
    expect(signOutTasks).toHaveLength(1);

    await act(async () => {
      await signOutTasks[0]?.('user');
    });

    expect(devices.dropped).toEqual([{ token: 'fcm-token-1' }]);
    expect(messaging.deletePushToken).toHaveBeenCalledOnce();
    expect(
      window.localStorage.getItem('redoctor-push-registration'),
    ).toBeNull();
  });

  it('offers it again, once, when a notice arrives live with the push off', async () => {
    window.localStorage.setItem('redoctor-push-declined', '1');
    renderSignedIn();
    const menu = await openMenu();
    expect(
      within(menu).queryByText('Activa las notificaciones'),
    ).not.toBeInTheDocument();
    await waitFor(() => {
      expect(channels.made).toHaveLength(1);
    });

    const event: RealtimeEvent = {
      kind: 'created',
      notification: toNotification(
        notificationResponseSchema.parse(
          buildNotificationResponse({ id: 'new-1', title: 'Cita confirmada' }),
        ),
      ),
      unreadCount: 3,
    };
    act(() => {
      channels.made[0]?.options.onEvent(event);
    });

    expect(
      await within(menu).findByText(/Acabas de recibir un aviso/),
    ).toBeInTheDocument();
  });

  it('offers nothing where the browser cannot', async () => {
    messaging.supported = false;
    renderSignedIn();
    const menu = await openMenu();

    await within(menu).findByRole('button', { name: /Cita cancelada/ });
    expect(
      within(menu).queryByText('Activa las notificaciones'),
    ).not.toBeInTheDocument();
  });
});
