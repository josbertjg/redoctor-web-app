'use client';

import dynamic from 'next/dynamic';

import Notifications from '@material-symbols/svg-400/rounded/notifications.svg?svgr';
import { useTranslations } from 'next-intl';
import { Popover } from 'radix-ui';

import { cn } from '@/app/lib/utils';

import { CountBadge } from '@/app/ui/count-badge';
import { Icon } from '@/app/ui/icons';

import { useNotifications } from '@/app/hooks/use-notifications';

import { NotificationsMenuSkeleton } from './notifications-menu-skeleton';

/*
 * The bell itself, with the inbox's menu under it (Radix Popover): loaded
 * only for a signed-in person (notifications-bell.tsx), so a visitor's
 * page carries none of it. The menu's own code comes with the first
 * opening — or a little before, when the pointer reaches the bell.
 */

const NotificationsMenu = dynamic(() => import('./notifications-menu'), {
  ssr: false,
  loading: () => <NotificationsMenuSkeleton />,
});

const prefetchMenu = () => {
  void import('./notifications-menu');
};

export default function BellPopover({
  className,
}: {
  className?: string | undefined;
}) {
  const t = useTranslations('notifications');
  const { unreadCount, menuOpen, setMenuOpen } = useNotifications();

  return (
    <Popover.Root open={menuOpen} onOpenChange={setMenuOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={
            unreadCount > 0
              ? t('bellUnread', { count: unreadCount })
              : t('bell')
          }
          onPointerEnter={prefetchMenu}
          onFocus={prefetchMenu}
          className={cn(
            'relative inline-flex min-h-touch min-w-touch animate-fade-in items-center justify-center rounded-full text-text-primary transition-colors duration-fast ease-house outline-none hover:bg-surface-variant focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=open]:bg-surface-variant',
            className,
          )}
        >
          <Icon icon={Notifications} size={24} />
          <CountBadge
            count={unreadCount}
            className="absolute top-1.5 right-1"
          />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          collisionPadding={16}
          aria-label={t('title')}
          className="z-30 flex max-h-[min(70vh,34rem)] w-[calc(100vw-2rem)] max-w-96 origin-top-right flex-col overflow-hidden rounded-2xl bg-pure-white shadow-lg outline-none data-[state=closed]:animate-fade-out data-[state=open]:animate-scale-in"
        >
          <NotificationsMenu />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
