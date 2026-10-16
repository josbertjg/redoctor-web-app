'use client';

import { useEffect } from 'react';

import dynamic from 'next/dynamic';

import { useNotifications } from '@/app/hooks/use-notifications';
import { useSession } from '@/app/hooks/use-session';

/*
 * The bell of every page with a session (the owner's call, 2026-10-14):
 * the unread count on it and, on a tap, the inbox as a menu that unfolds
 * under it. Nothing for a stranger — not even its code: the bell and its
 * menu (Radix's popover) load once someone is signed in, and early when
 * the session hint says someone likely is, so the bell is there as soon
 * as the account is.
 */

const loadBell = () => import('./bell-popover');

// Fetched ahead with the hint (below), the code is in hand before the
// account is: the bell fades in when it comes, never a box before it.
const BellPopover = dynamic(loadBell, { ssr: false, loading: () => null });

export function NotificationsBell({ className }: { className?: string }) {
  const { expected } = useSession();
  const { enabled } = useNotifications();

  useEffect(() => {
    if (expected) void loadBell();
  }, [expected]);

  if (!enabled) return null;

  return <BellPopover className={className} />;
}
