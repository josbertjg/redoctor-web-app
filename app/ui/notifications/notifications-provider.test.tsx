import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  NotificationsChannelOptions,
  RealtimeEvent,
} from '@/app/lib/notifications/socket';
import { meResponseSchema, toAccount } from '@/app/lib/schemas/identity';
import {
  notificationResponseSchema,
  toNotification,
} from '@/app/lib/schemas/notifications';

import {
  buildMeResponse,
  buildNewAccountMeResponse,
  buildSpecialistMeResponse,
} from '@/tests/factories/identity';
import {
  buildInboxResponse,
  buildNotificationResponse,
} from '@/tests/factories/notifications';
import { apiUrl, errorEnvelope } from '@/tests/msw/api-url';
import { validToken } from '@/tests/msw/handlers/identity';
import { server } from '@/tests/msw/server';
import { renderWithIntl } from '@/tests/render';

import {
  noSession,
  SessionContext,
  type Session,
} from '@/app/hooks/use-session';

import { NotificationsBell } from './notifications-bell';
import { NotificationsProvider } from './notifications-provider';
import { Toaster } from '../toast';

const router = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

/** The live channel as a stand-in the tests drive: no socket is opened. */
type FakeChannel = {
  options: NotificationsChannelOptions;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
  isConnected: () => boolean;
};
const channels = vi.hoisted(() => ({ made: [] as FakeChannel[] }));
vi.mock('@/app/lib/notifications/socket', () => ({
  notificationsChannelUrl: (apiUrl: string) => `${apiUrl}/ws/notifications`,
  createNotificationsChannel: (options: NotificationsChannelOptions) => {
    const channel: FakeChannel = {
      options,
      connect: vi.fn(),
      disconnect: vi.fn(),
      dispose: vi.fn(),
      isConnected: () => false,
    };
    channels.made.push(channel);
    return channel;
  },
}));

const user = {
  id: 'uid-1',
  email: 'ana@example.com',
  name: 'Ana Pérez',
  photo: null,
  provider: 'google' as const,
  getToken: () => Promise.resolve(validToken),
};

const patient = toAccount(meResponseSchema.parse(buildMeResponse()));
const specialist = toAccount(
  meResponseSchema.parse(buildSpecialistMeResponse()),
);
const newcomer = toAccount(meResponseSchema.parse(buildNewAccountMeResponse()));

function renderWithSession(session: Session) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const view = renderWithIntl(
    <QueryClientProvider client={client}>
      <SessionContext.Provider value={session}>
        <NotificationsProvider
          notices={{
            actionFailed:
              'No pudimos actualizar tus notificaciones. Inténtalo de nuevo.',
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
  return { ...view, client, invalidate };
}

const signedIn = (account = patient): Session => ({
  ...noSession,
  status: 'signed-in',
  user,
  account,
  accountStatus: 'ready',
});

const latestChannel = () => {
  const channel = channels.made.at(-1);
  if (!channel) throw new Error('no channel was made');
  return channel;
};

const arrive = (event: RealtimeEvent) => {
  act(() => {
    latestChannel().options.onEvent(event);
  });
};

const created = (
  overrides: Parameters<typeof buildNotificationResponse>[0],
  unreadCount: number | null = null,
): RealtimeEvent => ({
  kind: 'created',
  notification: toNotification(
    notificationResponseSchema.parse(buildNotificationResponse(overrides)),
  ),
  unreadCount,
});

const bell = () => screen.findByRole('button', { name: /^Notificaciones/ });

/** Opens the menu and waits for its code, which comes with the first opening. */
async function openMenu() {
  await userEvent.click(await bell());
  const menu = await screen.findByRole('dialog', { name: 'Notificaciones' });
  await within(menu).findByRole('heading', { name: 'Notificaciones' });
  return menu;
}

afterEach(() => {
  channels.made.length = 0;
});

describe('NotificationsProvider', () => {
  it('shows nothing to a stranger, nor to an account with no sign-up behind it', () => {
    const { unmount } = renderWithSession(noSession);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    unmount();

    renderWithSession(signedIn(newcomer));
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(channels.made).toHaveLength(0);
  });

  it('puts the unread count on the bell and opens the live channel', async () => {
    renderWithSession(signedIn());

    expect(
      await screen.findByRole('button', {
        name: 'Notificaciones, 2 sin leer',
      }),
    ).toHaveTextContent('2');
    await waitFor(() => {
      expect(channels.made).toHaveLength(1);
    });
    expect(latestChannel().connect).toHaveBeenCalled();
    expect(latestChannel().options.url).toContain('/ws/notifications');
  });

  it('unfolds the inbox as a menu: the title, how many unread, the notices and the ways to act', async () => {
    renderWithSession(signedIn());

    const menu = await openMenu();

    expect(within(menu).getByRole('heading', { name: 'Notificaciones' }));
    expect(within(menu).getByText('2 sin leer')).toBeInTheDocument();
    expect(
      within(menu).getByRole('button', { name: 'Marcar todas' }),
    ).toBeInTheDocument();
    const rows = within(menu).getAllByRole('button', {
      name: /Cita cancelada|Recordatorio de cita|Bienvenido a Redoctor/,
    });
    expect(rows).toHaveLength(3);
    // The unread ones say so to assistive technology.
    expect(rows[0]).toHaveAccessibleName(/^Sin leer\.\s?Cita cancelada/);
    expect(rows[2]).not.toHaveAccessibleName(/Sin leer/);
    expect(
      within(menu).getAllByRole('button', {
        name: 'Eliminar esta notificación',
      }),
    ).toHaveLength(3);
    expect(
      within(menu).getByRole('button', { name: 'Vaciar notificaciones' }),
    ).toBeInTheDocument();
    expect(await axe(menu)).toHaveNoViolations();
  });

  it('reads a notice on a tap and opens the appointment it is about', async () => {
    const read = vi.fn<(id: string) => void>();
    server.use(
      http.patch(
        apiUrl('/notifications/:notificationId/read'),
        ({ params }) => {
          read(String(params.notificationId));
          return HttpResponse.json(
            buildNotificationResponse({
              id: String(params.notificationId),
              readAt: '2026-10-14T21:00:00.000Z',
            }),
          );
        },
      ),
    );
    renderWithSession(signedIn());
    const menu = await openMenu();

    await userEvent.click(
      within(menu).getByRole('button', { name: /Cita cancelada/ }),
    );

    expect(router.push).toHaveBeenCalledWith('/a/appt-1');
    await waitFor(() => {
      expect(read).toHaveBeenCalledWith('c3d4e5f6-0000-4000-8000-000000000001');
    });
    // Read at once, before the API answers, and the menu closes to go.
    expect(
      await screen.findByRole('button', {
        name: 'Notificaciones, 1 sin leer',
      }),
    ).toBeInTheDocument();
  });

  it('marks every notice read at once', async () => {
    const readAll = vi.fn();
    server.use(
      http.patch(apiUrl('/notifications/read-all'), () => {
        readAll();
        return HttpResponse.json({ updated: 2 });
      }),
    );
    renderWithSession(signedIn());
    const menu = await openMenu();

    await userEvent.click(
      within(menu).getByRole('button', { name: 'Marcar todas' }),
    );

    expect(
      await screen.findByRole('button', { name: 'Notificaciones' }),
    ).toBeInTheDocument();
    // The line fades out (§8.2) before it leaves.
    await waitFor(() => {
      expect(within(menu).queryByText('2 sin leer')).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(readAll).toHaveBeenCalledOnce();
    });
  });

  it('keeps notices read when a read of the inbox was already on its way', async () => {
    // The inbox read the moment the person comes back to the tab, slow to
    // answer, carries the inbox as it was: it must not undo «Marcar todas».
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let reads = 0;
    server.use(
      http.get(apiUrl('/notifications/'), async () => {
        reads += 1;
        if (reads === 2) await gate;
        return HttpResponse.json(
          reads <= 2
            ? buildInboxResponse()
            : buildInboxResponse(
                [
                  buildNotificationResponse({
                    readAt: '2026-10-14T21:00:00.000Z',
                  }),
                ],
                0,
              ),
        );
      }),
      http.patch(apiUrl('/notifications/read-all'), () =>
        HttpResponse.json({ updated: 2 }),
      ),
    );
    const { client } = renderWithSession(signedIn());
    const menu = await openMenu();
    await within(menu).findByText('2 sin leer');

    void client.refetchQueries({
      queryKey: ['notifications', 'inbox', user.id],
    });
    await waitFor(() => {
      expect(reads).toBe(2);
    });
    await userEvent.click(
      within(menu).getByRole('button', { name: 'Marcar todas' }),
    );
    release();

    // Read again once the API had the write: the server's own inbox.
    await waitFor(() => {
      expect(reads).toBe(3);
    });
    expect(
      await screen.findByRole('button', { name: 'Notificaciones' }),
    ).toBeInTheDocument();
    // The line fades out (§8.2) before it leaves.
    await waitFor(() => {
      expect(within(menu).queryByText('2 sin leer')).not.toBeInTheDocument();
    });
  });

  it('deletes a notice in place, and puts it back when the API refuses', async () => {
    // A 400 and not a 500: the delete is idempotent, so a 5xx would be
    // retried with a wait before the refusal shows.
    server.use(
      http.delete(apiUrl('/notifications/:notificationId'), () =>
        HttpResponse.json(errorEnvelope('ERR_1002', 'Bad request'), {
          status: 400,
        }),
      ),
    );
    renderWithSession(signedIn());
    const menu = await openMenu();

    const [remove] = within(menu).getAllByRole('button', {
      name: 'Eliminar esta notificación',
    });
    if (!remove) throw new Error('no delete button');
    await userEvent.click(remove);

    expect(
      await screen.findByText(
        'No pudimos actualizar tus notificaciones. Inténtalo de nuevo.',
      ),
    ).toBeInTheDocument();
    expect(
      within(menu).getByRole('button', { name: /Cita cancelada/ }),
    ).toBeInTheDocument();
    expect(within(menu).getByText('2 sin leer')).toBeInTheDocument();
  });

  it('says which notice each «Eliminar» deletes, and hands the focus to the next one', async () => {
    renderWithSession(signedIn());
    const menu = await openMenu();

    const remove = within(menu).getByRole('button', {
      name: 'Eliminar esta notificación',
      description: 'Cita cancelada',
    });
    await userEvent.click(remove);

    await waitFor(() => {
      expect(
        within(menu).getByRole('button', { name: /Recordatorio de cita/ }),
      ).toHaveFocus();
    });
  });

  it('empties the inbox only after asking', async () => {
    const cleared = vi.fn();
    server.use(
      http.delete(apiUrl('/notifications/'), () => {
        cleared();
        return HttpResponse.json({ deleted: 3 });
      }),
    );
    renderWithSession(signedIn());
    const menu = await openMenu();

    await userEvent.click(
      within(menu).getByRole('button', { name: 'Vaciar notificaciones' }),
    );
    expect(
      within(menu).getByText(
        'Se borrarán todas tus notificaciones y no podrás recuperarlas.',
      ),
    ).toBeInTheDocument();
    expect(cleared).not.toHaveBeenCalled();

    await userEvent.click(within(menu).getByRole('button', { name: 'Vaciar' }));

    expect(
      await within(menu).findByText('No tienes notificaciones'),
    ).toBeInTheDocument();
    expect(cleared).toHaveBeenCalledOnce();
    expect(
      await screen.findByRole('button', { name: 'Notificaciones' }),
    ).toBeInTheDocument();
  });

  it('counts a notice arriving live, shows it as a banner and refreshes what it touches', async () => {
    const { invalidate } = renderWithSession(signedIn());
    await bell();
    await waitFor(() => {
      expect(channels.made).toHaveLength(1);
    });
    // The first inbox is the past: nothing was refreshed for it.
    expect(invalidate).not.toHaveBeenCalled();

    arrive(
      created(
        {
          id: 'new-1',
          title: 'Nueva cita agendada',
          data: { kind: 'APPOINTMENT_BOOKED', appointmentId: 'appt-9' },
        },
        3,
      ),
    );

    expect(
      await screen.findByRole('button', {
        name: 'Notificaciones, 3 sin leer',
      }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: /Nueva cita agendada/ }),
    ).toBeInTheDocument();
    await waitFor(
      () => {
        expect(invalidate).toHaveBeenCalledWith({
          queryKey: ['appointments', 'uid-1'],
        });
      },
      { timeout: 2000 },
    );
    expect(invalidate).not.toHaveBeenCalledWith({
      queryKey: ['report', 'specialist', 'uid-1'],
    });
  });

  it('refreshes the specialist statistics too, and the subscription for a billing notice', async () => {
    const { invalidate } = renderWithSession(signedIn(specialist));
    await bell();
    await waitFor(() => {
      expect(channels.made).toHaveLength(1);
    });

    arrive(created({ id: 'new-2', data: { appointmentId: 'appt-9' } }));
    arrive(
      created({
        id: 'new-3',
        title: 'Pago aprobado',
        data: { kind: 'BILLING_PAYMENT_APPROVED' },
        type: 'SYSTEM',
      }),
    );

    await waitFor(
      () => {
        expect(invalidate).toHaveBeenCalledWith({
          queryKey: ['report', 'specialist', 'uid-1'],
        });
        expect(invalidate).toHaveBeenCalledWith({
          queryKey: ['billing', 'subscription', 'uid-1'],
        });
        expect(invalidate).toHaveBeenCalledWith({
          queryKey: ['identity', 'me', 'uid-1'],
        });
      },
      { timeout: 2000 },
    );
  });

  it('shows no banner while the menu is open: the notice is a row already', async () => {
    renderWithSession(signedIn());
    const menu = await openMenu();
    await waitFor(() => {
      expect(channels.made).toHaveLength(1);
    });

    arrive(created({ id: 'new-4', title: 'Cita reprogramada' }));

    expect(
      await within(menu).findByRole('button', { name: /Cita reprogramada/ }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: /Cita reprogramada/ }),
    ).toHaveLength(1);
    expect(within(menu).getByText('3 sin leer')).toBeInTheDocument();
  });

  it('moves the count when the server says it moved elsewhere', async () => {
    renderWithSession(signedIn());
    await bell();
    await waitFor(() => {
      expect(channels.made).toHaveLength(1);
    });

    arrive({ kind: 'unread', unreadCount: 0 });

    expect(
      await screen.findByRole('button', { name: 'Notificaciones' }),
    ).toBeInTheDocument();
  });

  it('rests the channel while the tab is hidden and wakes it on the way back', async () => {
    renderWithSession(signedIn());
    await bell();
    await waitFor(() => {
      expect(channels.made).toHaveLength(1);
    });
    const channel = latestChannel();

    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(channel.disconnect).toHaveBeenCalledOnce();

    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(channel.connect).toHaveBeenCalledTimes(2);
  });

  it('says when the inbox could not be read, and tries again on «Reintentar»', async () => {
    let failing = true;
    server.use(
      // A 400 and not a 500: a read is retried on a 5xx (the app's policy),
      // and the error state would wait for the backoff.
      http.get(apiUrl('/notifications/'), () =>
        failing
          ? HttpResponse.json(errorEnvelope('ERR_1002', 'Bad request'), {
              status: 400,
            })
          : HttpResponse.json(buildInboxResponse()),
      ),
    );
    renderWithSession(signedIn());
    const menu = await openMenu();

    expect(
      await within(menu).findByText('No pudimos cargar tus notificaciones'),
    ).toBeInTheDocument();

    failing = false;
    await userEvent.click(
      within(menu).getByRole('button', { name: 'Reintentar' }),
    );

    expect(
      await within(menu).findByRole('button', { name: /Cita cancelada/ }),
    ).toBeInTheDocument();
  });
});
