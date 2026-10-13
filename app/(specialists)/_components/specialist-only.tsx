'use client';

import type { ReactNode } from 'react';

import { useSession } from '@/app/hooks/use-session';

/**
 * What only a specialist's account can use — the payment (M13): an admin's
 * account without the specialist facet gets the page with the app's options
 * (AGENTS.md §1), but `/pay` would only tell it the page is not for it.
 */
export function SpecialistOnly({ children }: { children: ReactNode }) {
  const { account } = useSession();
  if (account?.role === 'admin' && !account.specialist.exists) return null;
  return children;
}
