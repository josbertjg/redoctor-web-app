import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';

import { PageTransition } from '@/app/ui/motion/view-transitions';

import {
  DailySummaryOptOut,
  type DailySummaryLabels,
} from '../../_components/daily-summary-opt-out';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dailySummary');
  return {
    title: t('metaTitle'),
    // The URL carries the signed token: not even our own requests send it on.
    referrer: 'no-referrer',
  };
}

/*
 * `/daily-summary/unsubscribe?token=…`: the opt-out link of the API's daily
 * summary (M11), the API's own name for it. `/resumen/baja`, the first
 * name REDOC-359 gave it, redirects here (next.config.ts).
 */
export default async function DailySummaryOptOutPage({
  searchParams,
}: PageProps<'/daily-summary/unsubscribe'>) {
  const { token } = await searchParams;
  const t = await getTranslations('dailySummary');

  const view = (key: 'ask' | 'unsubscribed' | 'subscribed') => ({
    title: t(`${key}.title`),
    description: t(`${key}.description`),
    action: t(`${key}.action`),
  });
  const labels: DailySummaryLabels = {
    ask: view('ask'),
    unsubscribed: view('unsubscribed'),
    subscribed: view('subscribed'),
    invalidLink: {
      title: t('invalidLink.title'),
      description: t('invalidLink.description'),
    },
    failed: t('failed'),
  };

  return (
    <PageTransition>
      <main className="flex flex-1 flex-col justify-center pb-16">
        <DailySummaryOptOut
          token={typeof token === 'string' && token !== '' ? token : undefined}
          labels={labels}
        />
      </main>
    </PageTransition>
  );
}
