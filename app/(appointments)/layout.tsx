import type { ReactNode } from 'react';

import { getTranslations } from 'next-intl/server';

import { SessionButton } from '@/app/ui/auth/session-button';
import { SiteHeader } from '@/app/ui/layout/site-header';

/*
 * Module M5–M7: the patient's appointments. The bar carries the account,
 * so the person sees who is signed in; the error state renders under it.
 */
export default async function AppointmentsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const t = await getTranslations('common');

  return (
    <>
      <SiteHeader homeLabel={t('homeLabel')}>
        <SessionButton />
      </SiteHeader>
      {children}
    </>
  );
}
