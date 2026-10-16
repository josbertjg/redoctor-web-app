import type { ReactNode } from 'react';

import { getTranslations } from 'next-intl/server';

import { SessionControls } from '@/app/ui/auth/session-controls';
import { SiteHeader } from '@/app/ui/layout/site-header';

/*
 * Module M4: the invitation link. The bar carries the account, so the
 * person sees who is signed in before claiming; the error state renders
 * under it too.
 */
export default async function InvitationsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const t = await getTranslations('common');

  return (
    <>
      <SiteHeader homeLabel={t('homeLabel')}>
        <SessionControls />
      </SiteHeader>
      {children}
    </>
  );
}
