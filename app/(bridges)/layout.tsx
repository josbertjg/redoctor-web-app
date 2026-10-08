import type { ReactNode } from 'react';

import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';

import { SiteHeader } from '@/app/ui/layout/site-header';

/*
 * Module M11: pages that only open the app (the specialist's links from the
 * API's emails, and the app's internal paths) and the daily-summary opt-out.
 * None of them belongs in search results (AGENTS.md §6).
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function BridgesLayout({
  children,
}: {
  children: ReactNode;
}) {
  const t = await getTranslations('common');

  return (
    <>
      <SiteHeader homeLabel={t('homeLabel')} />
      {children}
    </>
  );
}
