import type { ReactNode } from 'react';

import { PanelFrame } from '@/app/ui/layout/panel-frame';

import { PaySkeleton } from './_components/pay-skeleton';

/*
 * Module M13 in the specialist's panel: «Mi suscripción» and its pages
 * under `/panel/subscription`, and the payment at `/pay`, out of the paths
 * the app opens (AGENTS.md §6). One frame for all of them, in a reading
 * column, kept while the person moves between them: the bar, the sections
 * and the session — the skeleton stands until `/me` answers, a stranger
 * goes to sign in and comes back, a patient gets a way out.
 */
export default function BillingLayout({ children }: { children: ReactNode }) {
  return (
    <PanelFrame width="narrow" fallback={<PaySkeleton />}>
      {children}
    </PanelFrame>
  );
}
