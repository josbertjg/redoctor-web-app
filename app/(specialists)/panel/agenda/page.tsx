import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';

import { pageNamespaces } from '@/app/lib/i18n/client-messages';

import { MessagesScope } from '@/app/ui/messages-scope';
import { PageTransition } from '@/app/ui/motion/view-transitions';

import { AgendaView } from '../../_components/agenda/agenda-view';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('panel.agenda');
  return { title: t('metaTitle'), robots: { index: false, follow: false } };
}

/*
 * `/panel/agenda` (M14): «Citas», around today — the week from laptops up,
 * the day on phones. On a phone with the app the same link opens the app's
 * day view; anywhere else, this page shows it. A day of its own is
 * `/panel/agenda/{YYYY-MM-DD}` (./[date]).
 */
export default function AgendaTodayPage() {
  return (
    <PageTransition>
      <MessagesScope namespaces={pageNamespaces.agenda}>
        <AgendaView pathDate={null} />
      </MessagesScope>
    </PageTransition>
  );
}
