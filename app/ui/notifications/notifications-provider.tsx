'use client';

import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useRouter } from 'next/navigation';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { canUseSpecialistArea, needsSignUp } from '@/app/lib/auth/account';
import { getSessionToken } from '@/app/lib/auth/token';
import {
  notificationDestination,
  type NotificationAudience,
} from '@/app/lib/notifications/destination';
import {
  createStaleScheduler,
  staleQueryKeys,
  staleTargets,
  type StaleScheduler,
  type StaleTarget,
} from '@/app/lib/notifications/effects';
import {
  emptyInbox,
  withAllRead,
  withArrivedNotification,
  withNotificationsRead,
  withoutNotification,
  withRestoredNotification,
  withUnreadCount,
} from '@/app/lib/notifications/inbox';
import type {
  NotificationsChannel,
  RealtimeEvent,
} from '@/app/lib/notifications/socket';
import { publicEnv } from '@/app/lib/public-env';
import { notificationKeys } from '@/app/lib/queries/notification-keys';
import type { Inbox, InboxNotification } from '@/app/lib/schemas/notifications';

import { toast } from '@/app/ui/toast';

import {
  NotificationsContext,
  type InboxStatus,
  type Notifications,
} from '@/app/hooks/use-notifications';
import { useSession } from '@/app/hooks/use-session';

import { showNotificationBanner } from './notification-banner';
import { usePush } from './use-push';

/*
 * Keeps the person's notifications current for the whole page (AGENTS.md
 * §1, the inbox in the pilot since 2026-10-14), the way the app's
 * NotificationsBloc and NotificationEffects do:
 *
 * - One read of the inbox feeds the bell's count and the menu's list.
 * - The live channel (app/lib/notifications/socket.ts) brings what happens
 *   while the tab is in view: a notice just created goes on top of the
 *   list, shows as a banner — unless the menu is open, where it is already
 *   a row — and counts; the unread count moves when it moves elsewhere.
 *   The channel rests while the tab is hidden; back in view, or back
 *   online, it reconnects and the inbox is read again if it is old.
 * - A notice is the proof that some state went stale: what it names
 *   (app/lib/notifications/effects.ts) is read again, once per target,
 *   600 ms after the last notice — also for what arrived while the tab was
 *   hidden, found by reading the inbox again. The first inbox is the past
 *   and refreshes nothing.
 * - Reading, reading all and deleting move the inbox at once and tell the
 *   API after; a refusal reads the inbox again (or puts the row back).
 *   Emptying waits for the API: it is final.
 *
 * - The web push (use-push.ts) reaches the browser with no tab in view;
 *   with one in view the channel shows the notice, and the worker only
 *   tells the tab, in case the channel is down.
 *
 * The inbox's reader (zod, the contract), the channel (socket.io-client)
 * and Firebase Messaging load on demand with the first signed-in page: the
 * landing's JavaScript carries none of them (§8.10). No sound on the web
 * (the owner's call).
 */

/** Stands in while nobody is signed in: the query is disabled then. */
const nobody = {
  id: 'nobody',
  getToken: () => Promise.reject(new Error('No session')),
};

/** Back in the tab, or back on the channel, after this long the inbox is read again (the app's rule). */
const RELOAD_AFTER_MS = 15_000;

type NotificationsProviderProps = {
  /**
   * Translated on the server: said when a notice could not be read or
   * deleted (`notifications.actionFailed`), and when this browser was
   * signed out from afar (`notifications.sessionClosedRemotely`).
   */
  notices: { actionFailed: string; sessionClosedRemotely: string };
  /** The web's version, for the device the push registers. */
  appVersion: string;
  children: ReactNode;
};

export function NotificationsProvider({
  notices,
  appVersion,
  children,
}: NotificationsProviderProps) {
  const { user, account, signOut, addSignOutTask } = useSession();
  const queryClient = useQueryClient();
  const router = useRouter();

  // Any signed-in account has an inbox; one with no sign-up behind it has
  // nothing to be told about yet.
  const enabled = user !== null && account !== null && !needsSignUp(account);
  const holder = user ?? nobody;
  const userId = holder.id;
  const audience: NotificationAudience = {
    patient: account?.patient.exists ?? false,
    specialist: account !== null && canUseSpecialistArea(account),
  };
  const inboxKey = notificationKeys.inbox(userId);

  const query = useQuery({
    queryKey: inboxKey,
    queryFn: async ({ signal }) => {
      // The inbox's reader — zod and the API's contract — loads with the
      // first signed-in page, not with every visitor's landing (§8.10).
      const { readInbox } = await import('@/app/lib/queries/notifications');
      return readInbox(holder, signal);
    },
    enabled,
    // The channel keeps it current; a return to the tab reads it again.
    staleTime: 60_000,
  });
  const inbox = enabled && query.data !== undefined ? query.data : null;

  const [live, setLive] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const push = usePush({
    enabled,
    holder,
    userId,
    appVersion,
    onRevoked: () => {
      // The server no longer knows this browser as the person's: as the
      // app, a sign-out, said once.
      toast(notices.sessionClosedRemotely, { id: 'session-revoked' });
      void signOut('revoked');
    },
    addSignOutTask,
  });

  const scheduler = useRef<StaleScheduler | null>(null);
  /** Notices whose effects ran: a reload of the inbox must not run them again. */
  const handled = useRef(new Set<string>());
  /** The first inbox read is the past, not news: it seeds `handled` and refreshes nothing. */
  const seeded = useRef(false);
  const readsInFlight = useRef(new Set<string>());
  const markingAll = useRef(false);

  const setInbox = (update: (current: Inbox) => Inbox) => {
    queryClient.setQueryData<Inbox>(inboxKey, (current) =>
      current === undefined ? current : update(current),
    );
  };

  /**
   * A write moves the inbox before the API answers. A read already on its
   * way (a return to the tab) would land after it with the inbox as it was,
   * and show a notice just read as unread again: it is called off first,
   * and made again once the API has the write (it may bring new notices).
   * Returns whether there was one, so the write knows to read again.
   */
  const updateInboxNow = async (
    update: (current: Inbox) => Inbox,
  ): Promise<boolean> => {
    const wasReading = queryClient.isFetching({ queryKey: inboxKey }) > 0;
    await queryClient.cancelQueries({ queryKey: inboxKey });
    setInbox(update);
    return wasReading;
  };

  const readAgainIf = (wasReading: boolean) => {
    if (wasReading && enabled) void query.refetch();
  };

  /* What a notice leaves stale, read again once the notices stop coming. */

  const refresh = useEffectEvent((target: StaleTarget) => {
    for (const queryKey of staleQueryKeys(target, userId)) {
      void queryClient.invalidateQueries({ queryKey });
    }
  });

  useEffect(() => {
    const instance = createStaleScheduler((target) => {
      refresh(target);
    });
    scheduler.current = instance;
    return () => {
      instance.cancelAll();
      scheduler.current = null;
    };
  }, []);

  // Another person: what the one before got means nothing to this one, and
  // their first inbox is the past again.
  useEffect(() => {
    seeded.current = false;
    handled.current.clear();
    readsInFlight.current.clear();
    markingAll.current = false;
    scheduler.current?.cancelAll();
  }, [userId]);

  const applyEffects = useEffectEvent((notification: InboxNotification) => {
    if (handled.current.has(notification.id)) return;
    handled.current.add(notification.id);
    for (const target of staleTargets(notification.data, audience)) {
      scheduler.current?.schedule(target);
    }
  });

  const onInboxRead = useEffectEvent((read: Inbox) => {
    if (!seeded.current) {
      // Seeded even when empty: otherwise the first notice of a clean
      // inbox would pass for history here.
      seeded.current = true;
      for (const notification of read.notifications) {
        handled.current.add(notification.id);
      }
      return;
    }
    // What arrived while the channel was down enters here.
    for (const notification of read.notifications) applyEffects(notification);
  });

  useEffect(() => {
    if (!enabled || query.data === undefined) return;
    onInboxRead(query.data);
  }, [enabled, query.data]);

  /* What can be done with a notice. */

  const notifyFailure = () => {
    toast.error(notices.actionFailed);
  };

  const markRead = async (notification: InboxNotification) => {
    const listed = queryClient
      .getQueryData<Inbox>(inboxKey)
      ?.notifications.find((other) => other.id === notification.id);
    if ((listed ?? notification).read) return;
    if (readsInFlight.current.has(notification.id)) return;
    readsInFlight.current.add(notification.id);
    try {
      const wasReading = await updateInboxNow((current) =>
        withNotificationsRead(
          current,
          [notification.id],
          new Date().toISOString(),
        ),
      );
      const { markNotificationRead } =
        await import('@/app/lib/queries/notifications');
      await markNotificationRead(holder, notification.id);
      readAgainIf(wasReading);
    } catch {
      // Not reverted, read again: a notice already gone (404) means the
      // whole list is old, not this row.
      notifyFailure();
      if (enabled) void query.refetch();
    } finally {
      readsInFlight.current.delete(notification.id);
    }
  };

  const openNotification = (notification: InboxNotification) => {
    void markRead(notification);
    const destination = notificationDestination(notification.data, audience);
    if (destination === null) return;
    setMenuOpen(false);
    router.push(destination);
  };

  const markAllRead = async () => {
    const current = queryClient.getQueryData<Inbox>(inboxKey);
    if (current === undefined || current.unreadCount === 0) return;
    if (markingAll.current) return;
    markingAll.current = true;
    try {
      const wasReading = await updateInboxNow((listed) =>
        withAllRead(listed, new Date().toISOString()),
      );
      const { markAllNotificationsRead } =
        await import('@/app/lib/queries/notifications');
      await markAllNotificationsRead(holder);
      readAgainIf(wasReading);
    } catch {
      notifyFailure();
      if (enabled) void query.refetch();
    } finally {
      markingAll.current = false;
    }
  };

  const remove = async (notification: InboxNotification) => {
    const current = queryClient.getQueryData<Inbox>(inboxKey);
    const index =
      current?.notifications.findIndex(
        (other) => other.id === notification.id,
      ) ?? -1;
    if (index < 0) return;
    const wasReading = await updateInboxNow((listed) =>
      withoutNotification(listed, notification.id),
    );
    try {
      const { deleteNotification } =
        await import('@/app/lib/queries/notifications');
      await deleteNotification(holder, notification.id);
      readAgainIf(wasReading);
    } catch {
      setInbox((listed) =>
        withRestoredNotification(listed, notification, index),
      );
      notifyFailure();
    }
  };

  // Not optimistic: it is final and there is no bin, so the inbox stays
  // until the server confirms it did it.
  const clear = async (): Promise<boolean> => {
    try {
      const { clearNotifications } =
        await import('@/app/lib/queries/notifications');
      await clearNotifications(holder);
      setInbox(() => emptyInbox);
      return true;
    } catch {
      notifyFailure();
      return false;
    }
  };

  /* The live channel. */

  const onRealtimeEvent = useEffectEvent((event: RealtimeEvent) => {
    if (event.kind === 'unread') {
      setInbox((current) => withUnreadCount(current, event.unreadCount));
      return;
    }
    const { notification } = event;
    if (queryClient.getQueryData<Inbox>(inboxKey) === undefined) {
      // Nowhere to put it yet: the inbox is read, and counts it.
      void queryClient.invalidateQueries({ queryKey: inboxKey });
    } else {
      setInbox((current) =>
        withArrivedNotification(current, notification, event.unreadCount),
      );
    }
    // The open menu shows it as a row already: no banner over it.
    if (!menuOpen) showNotificationBanner(notification, openNotification);
    applyEffects(notification);
    // With the push off, this is when turning it on matters: the person
    // just saw what they would miss with no tab in view.
    push.remind();
  });

  const reloadIfStale = useEffectEvent(() => {
    if (!enabled || query.isFetching) return;
    if (Date.now() - query.dataUpdatedAt < RELOAD_AFTER_MS) return;
    void query.refetch();
  });

  const onChannelStatus = useEffectEvent((connected: boolean) => {
    setLive(connected);
    // Whatever arrived while the channel was down is not in it.
    if (connected) reloadIfStale();
  });

  // Back in view: the inbox if it is old, and the push's heartbeat if due.
  const onVisible = useEffectEvent(() => {
    reloadIfStale();
    push.wake();
  });

  // The push's worker tells the tab of a notice it received: with the
  // channel down, the inbox is the only way to show it.
  const onWorkerMessage = useEffectEvent((event: MessageEvent) => {
    const message: unknown = event.data;
    if (
      typeof message !== 'object' ||
      message === null ||
      (message as { type?: unknown }).type !== 'redoctor:push'
    ) {
      return;
    }
    if (!live) reloadIfStale();
  });

  // One channel per signed-in person; none for a stranger.
  const channelFor = enabled ? userId : null;
  useEffect(() => {
    if (channelFor === null) return;
    let disposed = false;
    let channel: NotificationsChannel | null = null;

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        // In the background the channel would hold a connection for
        // nothing; what happens meanwhile is read on the way back.
        channel?.disconnect();
        return;
      }
      channel?.connect();
      onVisible();
    };
    const onOnline = () => {
      channel?.connect();
    };
    const onMessage = (event: MessageEvent) => {
      onWorkerMessage(event);
    };
    // Browsers without service workers (an insecure context) have none to listen to.
    const worker =
      'serviceWorker' in navigator ? navigator.serviceWorker : null;

    import('@/app/lib/notifications/socket')
      .then(({ createNotificationsChannel, notificationsChannelUrl }) => {
        if (disposed) return;
        channel = createNotificationsChannel({
          url: notificationsChannelUrl(publicEnv.apiUrl),
          getToken: getSessionToken,
          onEvent: (event) => {
            onRealtimeEvent(event);
          },
          onStatus: (connected) => {
            onChannelStatus(connected);
          },
        });
        if (document.visibilityState !== 'hidden') channel.connect();
      })
      .catch(() => {
        // The channel could not load (a blocked script): the inbox still
        // reads on demand, and again on each return to the tab.
      });

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', onOnline);
    worker?.addEventListener('message', onMessage);
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', onOnline);
      worker?.removeEventListener('message', onMessage);
      channel?.dispose();
      channel = null;
      setLive(false);
    };
  }, [channelFor]);

  const status: InboxStatus = !enabled
    ? 'idle'
    : query.data !== undefined
      ? 'ready'
      : query.isError
        ? 'error'
        : 'loading';

  const value: Notifications = {
    enabled,
    status,
    inbox,
    unreadCount: inbox?.unreadCount ?? 0,
    refreshing: query.isFetching,
    live,
    menuOpen,
    setMenuOpen,
    retry: () => {
      // Another tap while it is on its way would cancel it and start over.
      if (!enabled || query.isFetching) return;
      void query.refetch();
    },
    open: openNotification,
    markAllRead: () => {
      void markAllRead();
    },
    remove: (notification) => {
      void remove(notification);
    },
    clear,
    push,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}
