import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';

import { pageNamespaces } from '@/app/lib/i18n/client-messages';

import { MessagesScope } from '@/app/ui/messages-scope';

import { AgendaDay } from '../../_components/agenda-day';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('panel.agenda');
  return { title: t('metaTitle'), robots: { index: false, follow: false } };
}

/*
 * `/panel/agenda` (M14): today in the specialist's agenda. On a phone with
 * the app the same link opens the app's day view; anywhere else, this page
 * shows it. A day of its own is `/panel/agenda/{YYYY-MM-DD}` (./[date]).
 */
export default function AgendaTodayPage() {
  return (
    <MessagesScope namespaces={pageNamespaces.agenda}>
      <AgendaDay day={null} />
    </MessagesScope>
  );
}
