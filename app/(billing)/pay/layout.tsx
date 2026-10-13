import { getTranslations } from 'next-intl/server';

import { routes } from '@/app/lib/routes';

import { RequireSession } from '@/app/ui/auth/require-session';
import { SessionButton } from '@/app/ui/auth/session-button';
import { SiteHeader } from '@/app/ui/layout/site-header';

import { PayPageSkeleton } from '../_components/pay-skeleton';

/*
 * `/pay` (M13) is the specialist's own page, so the session comes first
 * (AGENTS.md §3.5): the bar carries the account, the skeleton stands until
 * `/me` answers, a stranger goes to sign in and comes back, and a patient
 * gets a way out. Never an app path: the app never links here (§6).
 */
export default async function PayLayout({ children }: LayoutProps<'/pay'>) {
  const t = await getTranslations('common');

  return (
    <>
      <SiteHeader homeLabel={t('homeLabel')}>
        <SessionButton redirect={routes.payment()} />
      </SiteHeader>
      <RequireSession facet="specialist" fallback={<PayPageSkeleton />}>
        {children}
      </RequireSession>
    </>
  );
}
