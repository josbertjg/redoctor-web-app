'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { canUseSpecialistArea } from '@/app/lib/auth/account';
import { routes } from '@/app/lib/routes';

import { useSession } from '@/app/hooks/use-session';

/*
 * The landing's second guard for the specialist's panel (owner,
 * 2026-10-13). The server already sends a browser with the panel hint to
 * `/panel`; this catches a session the hint did not know of yet (the API
 * answers after the page paints) and moves on to the panel once it does.
 */
export function SpecialistRedirect() {
  const { account } = useSession();
  const router = useRouter();
  const toPanel = account !== null && canUseSpecialistArea(account);

  useEffect(() => {
    if (toPanel) router.replace(routes.specialistHome());
  }, [toPanel, router]);

  return null;
}
