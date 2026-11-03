import { Suspense } from 'react';

import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';

import { pageNamespaces } from '@/app/lib/i18n/client-messages';

import { PanelSurface } from '@/app/ui/layout/panel-surface';
import { MessagesScope } from '@/app/ui/messages-scope';
import { PageTransition } from '@/app/ui/motion/view-transitions';

import {
  ReportsSkeleton,
  ReportsView,
} from '../../_components/reports/reports-view';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('reports.statistics');
  return { title: t('metaTitle'), robots: { index: false, follow: false } };
}

/*
 * `/panel/reports` (M14): the specialist's statistics. On a phone with the
 * app the same link opens the app's «Estadísticas».
 */
export default function ReportsPage() {
  return (
    <PageTransition>
      <MessagesScope namespaces={pageNamespaces.reports}>
        {/* The period lives in the address: read in the browser, under a boundary. */}
        <PanelSurface>
          <Suspense fallback={<ReportsSkeleton />}>
            <ReportsView />
          </Suspense>
        </PanelSurface>
      </MessagesScope>
    </PageTransition>
  );
}
