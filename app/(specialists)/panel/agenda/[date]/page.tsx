import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';

import { pageNamespaces } from '@/app/lib/i18n/client-messages';
import { isCalendarDay } from '@/app/lib/reports/period';

import { MessagesScope } from '@/app/ui/messages-scope';

import { AgendaDay } from '../../../_components/agenda-day';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('panel.agenda');
  return { title: t('metaTitle'), robots: { index: false, follow: false } };
}

/*
 * `/panel/agenda/{YYYY-MM-DD}` (M14): one day of the specialist's agenda,
 * the «Ver mi agenda» of the API's daily summary (email 10). A malformed
 * day is today, as the app reads it. Deeper paths match no route here, so
 * they answer a real 404 (AGENTS.md §4).
 */
export default async function AgendaDayPage({
  params,
}: PageProps<'/panel/agenda/[date]'>) {
  const { date } = await params;

  return (
    <MessagesScope namespaces={pageNamespaces.agenda}>
      <AgendaDay day={isCalendarDay(date) ? date : null} />
    </MessagesScope>
  );
}
