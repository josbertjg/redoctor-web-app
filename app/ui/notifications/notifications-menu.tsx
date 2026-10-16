'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

import Close from '@material-symbols/svg-400/rounded/close.svg?svgr';
import ErrorIcon from '@material-symbols/svg-400/rounded/error.svg?svgr';
import NotificationsActive from '@material-symbols/svg-400/rounded/notifications_active.svg?svgr';
import NotificationsOff from '@material-symbols/svg-400/rounded/notifications_off.svg?svgr';
import { useTranslations } from 'next-intl';

import { formatShortDate } from '@/app/lib/format/dates';
import { relativeTime } from '@/app/lib/notifications/time';
import type { InboxNotification } from '@/app/lib/schemas/notifications';
import { cn } from '@/app/lib/utils';

import { Button } from '@/app/ui/button';
import { EmptyState } from '@/app/ui/empty-state';
import { Icon } from '@/app/ui/icons';
import {
  AnimatePresence,
  houseTransition,
  m,
  useReducedMotion,
} from '@/app/ui/motion';
import { MotionProvider } from '@/app/ui/motion/provider';

import { useNotifications, type Push } from '@/app/hooks/use-notifications';

import { notificationTone } from './notification-tone';
import { NotificationsMenuSkeleton } from './notifications-menu-skeleton';

/*
 * The inbox, as the menu that unfolds from the bell (the owner's call,
 * 2026-10-14: a dropdown, never a sheet): the title with how many are
 * unread and «Marcar todas», the notices the newest first — the unread
 * ones in bold with a blue dot, each one a button that reads it and opens
 * what it is about, with its own «Eliminar» —, and at the foot «Vaciar
 * notificaciones», which asks before it does (the app's inbox screen).
 * The API paginates nothing here: fifty at most, and emptying instead.
 *
 * Whatever removes the control in hand — «Marcar todas», a row deleted,
 * the inbox emptied, the push's card answered — leaves the focus on what
 * comes next (the next row, or the title), never on nothing.
 */

type Words = ReturnType<typeof useTranslations<'notifications'>>;

/** The clock the time labels read, half a minute at a time while the menu is open. */
const tick = 30_000;
const subscribeClock = (onChange: () => void) => {
  const id = setInterval(onChange, tick);
  return () => {
    clearInterval(id);
  };
};
const readClock = () => Math.floor(Date.now() / tick) * tick;
const noClock = () => 0;

function useNow(): number {
  return useSyncExternalStore(subscribeClock, readClock, noClock);
}

function timeLabel(
  t: Words,
  createdAt: string | null,
  now: number,
): string | null {
  if (now === 0) return null;
  const relative = relativeTime(createdAt, now);
  if (relative === null) return null;
  switch (relative.kind) {
    case 'now':
      return t('time.now');
    case 'yesterday':
      return t('time.yesterday');
    case 'date':
      return formatShortDate(relative.instant);
    case 'minutes':
    case 'hours':
    case 'days':
      return t(`time.${relative.kind}`, { count: relative.count });
  }
}

export default function NotificationsMenu() {
  const t = useTranslations('notifications');
  const words = useTranslations();
  const {
    status,
    inbox,
    unreadCount,
    refreshing,
    retry,
    open,
    markAllRead,
    remove,
    clear,
    push,
  } = useNotifications();
  const now = useNow();
  const titleId = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const clearActionRef = useRef<HTMLButtonElement>(null);
  const clearCancelRef = useRef<HTMLButtonElement>(null);
  const [clearing, setClearing] = useState<'idle' | 'asking' | 'busy'>('idle');
  const reduced = useReducedMotion();
  const fade = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: reduced ? { duration: 0 } : houseTransition('fast'),
  };

  const notifications = inbox?.notifications ?? [];
  const listed = status === 'ready' && notifications.length > 0;

  const focusTitle = () => {
    titleRef.current?.focus();
  };

  // The confirmation takes the focus as it opens; going back gives it to
  // «Vaciar notificaciones» again.
  const previousClearing = useRef(clearing);
  useEffect(() => {
    const before = previousClearing.current;
    previousClearing.current = clearing;
    if (before === 'idle' && clearing === 'asking')
      clearCancelRef.current?.focus();
    if (before === 'asking' && clearing === 'idle')
      clearActionRef.current?.focus();
  }, [clearing]);

  const onClear = async () => {
    if (clearing === 'busy') return;
    setClearing('busy');
    const done = await clear();
    if (done) {
      // The list and its foot are gone: the title is what is left.
      previousClearing.current = 'idle';
      setClearing('idle');
      focusTitle();
    } else {
      setClearing('asking');
    }
  };

  return (
    <MotionProvider>
      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-2">
        <div className="min-w-0">
          <h2
            id={titleId}
            ref={titleRef}
            tabIndex={-1}
            className="text-title-md text-text-primary outline-none"
          >
            {t('title')}
          </h2>
          <AnimatePresence initial={false}>
            {unreadCount > 0 ? (
              <m.p
                key="unread"
                {...fade}
                className="text-body-sm text-text-secondary"
              >
                {t('unread', { count: unreadCount })}
              </m.p>
            ) : null}
          </AnimatePresence>
        </div>
        <AnimatePresence initial={false}>
          {unreadCount > 0 ? (
            <m.button
              key="mark-all"
              type="button"
              {...fade}
              onClick={() => {
                markAllRead();
                // The button goes with the last unread notice.
                focusTitle();
              }}
              className="-mt-1 -mr-2 inline-flex min-h-touch shrink-0 items-center rounded-lg px-2 text-label-lg text-primary transition-colors duration-fast ease-house outline-none hover:bg-surface-variant focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {t('markAllRead')}
            </m.button>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2">
        {push.invite !== 'none' ? (
          <PushInvitation push={push} onAnswered={focusTitle} />
        ) : null}
        {status === 'idle' || status === 'loading' ? (
          <NotificationsMenuSkeleton withHeader={false} />
        ) : null}
        {status === 'error' ? (
          <EmptyState
            headingLevel={3}
            tone="error"
            icon={ErrorIcon}
            title={t('loadErrorTitle')}
            description={t('loadErrorDescription')}
            className="py-6"
            action={
              <Button
                variant="white"
                size="small"
                loading={refreshing}
                onClick={retry}
              >
                {words('retry')}
              </Button>
            }
          />
        ) : null}
        {status === 'ready' && notifications.length === 0 ? (
          <EmptyState
            headingLevel={3}
            icon={NotificationsOff}
            title={t('emptyTitle')}
            description={t('emptyDescription')}
            className="py-6"
          />
        ) : null}
        {listed ? (
          <NotificationList
            notifications={notifications}
            now={now}
            onOpen={open}
            onRemove={remove}
            onEmptied={focusTitle}
          />
        ) : null}
      </div>

      {listed ? (
        <div className="border-t border-divider px-3 py-2">
          {clearing === 'idle' ? (
            <button
              ref={clearActionRef}
              type="button"
              onClick={() => {
                setClearing('asking');
              }}
              className="inline-flex min-h-touch items-center rounded-lg px-2 text-label-lg text-error-700 transition-colors duration-fast ease-house outline-none hover:bg-error-light focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {t('clear.action')}
            </button>
          ) : (
            <div className="flex animate-fade-in flex-col gap-3 p-1">
              <p className="text-body-sm text-text-secondary">
                {t('clear.description')}
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  ref={clearCancelRef}
                  variant="white"
                  size="small"
                  onClick={() => {
                    setClearing('idle');
                  }}
                >
                  {t('clear.cancel')}
                </Button>
                <Button
                  variant="error"
                  size="small"
                  loading={clearing === 'busy'}
                  onClick={() => {
                    void onClear();
                  }}
                >
                  {t('clear.confirm')}
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : null}
      {push.status === 'denied' ? (
        <p className="animate-fade-in border-t border-divider px-4 py-3 text-label-sm text-text-secondary">
          {t('permission.blocked')}
        </p>
      ) : null}
    </MotionProvider>
  );
}

/*
 * The offer to turn the push on (the app's permission sheet, as a card in
 * the menu): why it matters, or — after «Ahora no» — the notice that just
 * arrived and would have been missed with no tab in view. «Activar» asks
 * the browser; the answer decides what the menu shows next.
 */
type PushInvitationProps = {
  push: Push;
  /** The card goes once answered: the focus goes back to the menu's title. */
  onAnswered: () => void;
};

function PushInvitation({ push, onAnswered }: PushInvitationProps) {
  const t = useTranslations('notifications');

  return (
    <div className="mx-1 mt-1 mb-2 flex animate-fade-in flex-col gap-3 rounded-xl bg-info-light p-3">
      <div className="flex gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-pure-white text-primary">
          <Icon icon={NotificationsActive} size={20} />
        </span>
        <div className="min-w-0">
          <p className="text-label-lg text-text-primary">
            {t('permission.title')}
          </p>
          <p className="mt-0.5 text-body-sm text-text-secondary">
            {push.invite === 'reminder'
              ? t('permission.reminder')
              : t('permission.description')}
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button
          variant="white"
          size="small"
          onClick={() => {
            push.dismiss();
            onAnswered();
          }}
        >
          {t('permission.later')}
        </Button>
        <Button
          size="small"
          loading={push.status === 'enabling'}
          onClick={() => {
            void push.enable().finally(onAnswered);
          }}
        >
          {t('permission.accept')}
        </Button>
      </div>
    </div>
  );
}

type NotificationListProps = {
  notifications: readonly InboxNotification[];
  now: number;
  onOpen: (notification: InboxNotification) => void;
  onRemove: (notification: InboxNotification) => void;
  /** The last row was deleted: the focus needs somewhere to go. */
  onEmptied: () => void;
};

/** The rows; one that arrives unfolds into place, one removed folds away (§8.2). */
function NotificationList({
  notifications,
  now,
  onOpen,
  onRemove,
  onEmptied,
}: NotificationListProps) {
  const reduced = useReducedMotion();
  const transition = reduced ? { duration: 0 } : houseTransition('fast');
  const list = useRef<HTMLUListElement>(null);

  // A row deleted hands the focus to the next one, or the one before.
  const removeAt = (index: number) => {
    const removed = notifications[index];
    if (!removed) return;
    const neighbor = notifications[index + 1] ?? notifications[index - 1];
    onRemove(removed);
    if (!neighbor) {
      onEmptied();
      return;
    }
    list.current
      ?.querySelector<HTMLButtonElement>(
        `[data-notification="${CSS.escape(neighbor.id)}"]`,
      )
      ?.focus();
  };

  return (
    <ul ref={list} className="flex flex-col">
      <AnimatePresence initial={false}>
        {notifications.map((notification, index) => (
          <m.li
            key={notification.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={transition}
            className="overflow-hidden"
          >
            <NotificationRow
              notification={notification}
              now={now}
              onOpen={() => {
                onOpen(notification);
              }}
              onRemove={() => {
                removeAt(index);
              }}
            />
          </m.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

type NotificationRowProps = {
  notification: InboxNotification;
  now: number;
  onOpen: () => void;
  onRemove: () => void;
};

/*
 * A row (the app's NotificationItem): read and unread told apart by weight
 * and by the dot, never by a tinted background — a list half tinted reads
 * as if something were wrong.
 */
function NotificationRow({
  notification,
  now,
  onOpen,
  onRemove,
}: NotificationRowProps) {
  const t = useTranslations('notifications');
  const tone = notificationTone(notification.type);
  const time = timeLabel(t, notification.createdAt, now);
  const unread = !notification.read;
  const titleId = useId();

  return (
    <div className="flex gap-1 rounded-xl p-1 transition-colors duration-fast ease-house hover:bg-surface-variant">
      <button
        type="button"
        data-notification={notification.id}
        onClick={onOpen}
        className="flex min-w-0 flex-1 cursor-pointer gap-3 rounded-lg p-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-full',
            tone.className,
          )}
        >
          <Icon icon={tone.icon} size={20} />
        </span>
        <span className="min-w-0 flex-1">
          {unread ? <span className="sr-only">{t('unreadMark')} </span> : null}
          <span
            id={titleId}
            className={cn(
              'block text-body-md',
              unread
                ? 'font-semibold text-pure-black'
                : 'font-medium text-text-primary',
            )}
          >
            {notification.title}
          </span>
          <span className="mt-0.5 line-clamp-3 text-body-sm text-text-secondary">
            {notification.body}
          </span>
          {time ? (
            <span className="mt-1.5 block text-label-sm text-text-secondary">
              {time}
            </span>
          ) : null}
        </span>
      </button>
      <span className="flex shrink-0 flex-col items-center">
        {unread ? (
          <span
            aria-hidden="true"
            className="mt-3 mb-0.5 size-2.5 rounded-full bg-primary"
          />
        ) : null}
        <button
          type="button"
          aria-label={t('delete')}
          aria-describedby={titleId}
          onClick={onRemove}
          className="flex min-h-touch min-w-touch items-center justify-center rounded-full text-text-secondary transition-colors duration-fast ease-house outline-none hover:bg-white-400 hover:text-error-700 focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Icon icon={Close} size={18} />
        </button>
      </span>
    </div>
  );
}
