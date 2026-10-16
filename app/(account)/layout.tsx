import type { ReactNode } from 'react';

import { getTranslations } from 'next-intl/server';

import { SessionControls } from '@/app/ui/auth/session-controls';
import { SiteHeader } from '@/app/ui/layout/site-header';

/*
 * Module M10: the legal pages (terms, privacy, account deletion), public,
 * under the bar with the account, so a signed-in person keeps their way
 * around while reading.
 */
export default async function AccountLayout({
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
