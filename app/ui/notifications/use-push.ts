import { useEffect, useEffectEvent, useState } from 'react';

import type { TokenHolder } from '@/app/lib/api/types';
import {
  clearDeclined,
  describeBrowser,
  deviceId,
  forgetRegistration,
  heartbeatIsDue,
  loadRegistration,
  markDeclined,
  markHeartbeat,
  readPermission,
  saveRegistration,
  wasDeclined,
  WEB_PLATFORM,
  type BrowserPermission,
} from '@/app/lib/notifications/push';
import { publicEnv } from '@/app/lib/public-env';

import type {
  Push,
  PushInvite,
  PushStatus,
} from '@/app/hooks/use-notifications';
import type { SignOutTask } from '@/app/hooks/use-session';

/*
 * The web push of the notifications (the second phase), the way the app's
 * FirebasePushMessagingService and NotificationPermissionCubit do it:
 *
 * - Nothing without the VAPID key, nor where the browser cannot.
 * - The permission is asked on a tap, never on arrival: the menu offers it
 *   («Activa las notificaciones»); «Ahora no» is remembered, and the offer
 *   comes back once per visit when a notice arrives live with the push off
 *   — the moment turning it on matters.
 * - Allowed, this browser is registered among the person's devices
 *   (platform WEB, a stable device id, the browser's name, the web's
 *   version) on each signed-in visit, which renews the token too; then it
 *   says it is still in use every twelve hours, and a server that no longer
 *   knows it means a sign-out from afar.
 * - Before the person signs out, the device is dropped — with the token
 *   still valid — and the browser forgets the push token, so none follows
 *   the person on a shared computer.
 *
 * Firebase Messaging and the inbox's writer load on demand, with the first
 * signed-in page that has the key.
 */

type UsePushOptions = {
  /** Someone is signed in with an account that has an inbox. */
  enabled: boolean;
  holder: TokenHolder;
  userId: string;
  /** The web's version, for the device's record. */
  appVersion: string;
  /** The server no longer knows this browser as the person's: a sign-out from afar. */
  onRevoked: () => void;
  addSignOutTask: (task: SignOutTask) => () => void;
};

export type PushControls = Push & {
  /** A notice just arrived live: with the push off, this is when turning it on matters. */
  remind: () => void;
  /** The tab is back in view: the device says it is still in use, when due. */
  wake: () => void;
};

const vapidKey = publicEnv.firebase.vapidKey;

export function usePush(options: UsePushOptions): PushControls {
  const { enabled, holder, userId, appVersion, onRevoked, addSignOutTask } =
    options;
  const [status, setStatus] = useState<PushStatus>(
    vapidKey === undefined ? 'off' : 'unsupported',
  );
  // Declined until the storage says: the offer never flashes before.
  const [declined, setDeclined] = useState(true);
  const [reminded, setReminded] = useState(false);

  // What this browser can do, and what it answered before.
  useEffect(() => {
    if (!enabled || vapidKey === undefined) return;
    let cancelled = false;
    import('@/app/lib/firebase/messaging')
      .then(async ({ isPushSupported }) => {
        const supported = await isPushSupported();
        if (cancelled) return;
        setStatus(supported ? readPermission() : 'unsupported');
        setDeclined(wasDeclined());
      })
      .catch(() => {
        // Firebase Messaging could not load: no push in this visit.
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  /*
   * Only a device registered as this person with this token is asked
   * about: for any other the server would rightly say it does not know it
   * — a registration half done, a refused permission, the fresh token a
   * sign-out leaves — and that is no sign-out from afar.
   */
  const heartbeat = async (token: string) => {
    const registration = loadRegistration();
    if (registration === null) return;
    if (registration.userId !== userId || registration.token !== token) return;
    if (!heartbeatIsDue(Date.now())) return;
    try {
      const { deviceHeartbeat } =
        await import('@/app/lib/queries/notifications');
      const registered = await deviceHeartbeat(holder, token);
      markHeartbeat(Date.now());
      if (!registered) onRevoked();
    } catch {
      // A network failure never closes a session.
    }
  };

  const register = useEffectEvent(async () => {
    if (vapidKey === undefined) return;
    try {
      const [{ getPushToken }, { registerDeviceToken }] = await Promise.all([
        import('@/app/lib/firebase/messaging'),
        import('@/app/lib/queries/notifications'),
      ]);
      const token = await getPushToken(vapidKey);
      const id = deviceId();
      await registerDeviceToken(holder, {
        token,
        platform: WEB_PLATFORM,
        ...(id === null ? {} : { deviceId: id }),
        deviceName: describeBrowser(navigator.userAgent),
        ...(appVersion === '' ? {} : { appVersion }),
      });
      saveRegistration({ userId, token });
      await heartbeat(token);
    } catch {
      // The inbox and the live channel work without the push; tried again
      // on the next visit.
    }
  });

  // Allowed before — this visit or another —: registered without asking,
  // which renews the token if it changed.
  const registrant = enabled && status === 'granted' ? userId : null;
  useEffect(() => {
    if (registrant === null) return;
    void register();
  }, [registrant]);

  const dropDevice = useEffectEvent(
    async (reason: Parameters<SignOutTask>[0]) => {
      const registration = loadRegistration();
      if (registration === null) return;
      forgetRegistration();
      try {
        // The API's record — unless the session was refused already, or the
        // device revoked from afar: the server has nothing to drop then.
        if (reason === 'user' && registration.userId === userId) {
          const { unregisterDeviceToken } =
            await import('@/app/lib/queries/notifications');
          await unregisterDeviceToken(holder, registration.token);
        }
      } catch {
        // The token below goes all the same.
      }
      try {
        const { deletePushToken } =
          await import('@/app/lib/firebase/messaging');
        await deletePushToken();
      } catch {
        // Nothing to drop.
      }
    },
  );

  // Before the Firebase session ends: the token must still be valid.
  useEffect(() => {
    if (!enabled) return;
    return addSignOutTask((reason) => dropDevice(reason));
  }, [enabled, addSignOutTask]);

  const enable = async () => {
    if (status !== 'default' || vapidKey === undefined) return;
    setStatus('enabling');
    let answer: BrowserPermission;
    try {
      answer = await Notification.requestPermission();
    } catch {
      answer = 'denied';
    }
    if (answer === 'granted') {
      clearDeclined();
      setDeclined(false);
      setStatus('granted');
      return;
    }
    if (answer === 'denied') {
      setStatus('denied');
      return;
    }
    // The browser's prompt was dismissed: a «no» for now.
    markDeclined();
    setDeclined(true);
    setReminded(false);
    setStatus('default');
  };

  const dismiss = () => {
    markDeclined();
    setDeclined(true);
    setReminded(false);
  };

  const remind = () => {
    if (status === 'default') setReminded(true);
  };

  const wake = () => {
    const registration = loadRegistration();
    if (status === 'granted' && registration !== null) {
      void heartbeat(registration.token);
    }
  };

  const asking = status === 'default' || status === 'enabling';
  const invite: PushInvite = !asking
    ? 'none'
    : !declined
      ? 'first'
      : reminded
        ? 'reminder'
        : 'none';

  return {
    status,
    invite,
    enable,
    dismiss,
    remind,
    wake,
  };
}
