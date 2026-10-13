import { Suspense } from 'react';

import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';

import { pageNamespaces } from '@/app/lib/i18n/client-messages';

import { MessagesScope } from '@/app/ui/messages-scope';

import {
  AppointmentsHistory,
  HistorySkeleton,
} from '../../_components/appointments-history';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('panel.history');
  return { title: t('metaTitle'), robots: { index: false, follow: false } };
}

/*
 * `/panel/appointments` (M14): the history of the specialist's
 * appointments, with its filters in the address. On a phone with the app
 * the same link opens the app's «Citas».
 */
export default function SpecialistAppointmentsPage() {
  return (
    <MessagesScope namespaces={pageNamespaces.agenda}>
      {/* The filters live in the address: read in the browser, under a boundary. */}
      <Suspense fallback={<HistorySkeleton />}>
        <AppointmentsHistory />
      </Suspense>
    </MessagesScope>
  );
}
