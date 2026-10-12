import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';

import { pageNamespaces } from '@/app/lib/i18n/client-messages';

import { LinkOriginTracker } from '@/app/ui/analytics/link-origin-tracker';
import { MessagesScope } from '@/app/ui/messages-scope';

import { AppointmentFlow } from '../../_components/appointment-flow';

/*
 * `/a/{id}` (M5): the patient's appointment, from the specialist's WhatsApp
 * and from the API's emails (11 to 15). The id is a shortcut, not a
 * credential: the API shows the appointment only to its patient. Never
 * indexed, and the preview says nothing about it (AGENTS.md §6). Read in
 * the browser with the patient's session (§4).
 */

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('appointments.detail');
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    robots: { index: false, follow: false },
    openGraph: { title: t('metaTitle'), description: t('metaDescription') },
  };
}

export default async function AppointmentPage({
  params,
}: PageProps<'/a/[appointmentId]'>) {
  const { appointmentId } = await params;

  return (
    <>
      <LinkOriginTracker link="appointment" />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-gutter pt-6 pb-16">
        <MessagesScope namespaces={pageNamespaces.appointment}>
          <AppointmentFlow appointmentId={appointmentId} />
        </MessagesScope>
      </main>
    </>
  );
}
