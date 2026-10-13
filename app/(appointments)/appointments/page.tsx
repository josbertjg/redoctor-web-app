import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';

import { pageNamespaces } from '@/app/lib/i18n/client-messages';

import { MessagesScope } from '@/app/ui/messages-scope';

import { AppointmentsFlow } from '../_components/appointments-flow';

/*
 * `/appointments` (M6): the patient's appointments, «Próximas» and
 * «Pasadas», behind the review wall (M7) while a finished consultation
 * waits for its rating. Read in the browser with the patient's session
 * (AGENTS.md §4); never indexed.
 */

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('appointments.list');
  return { title: t('metaTitle'), robots: { index: false, follow: false } };
}

export default function PatientAppointmentsPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-gutter pt-6 pb-16">
      <MessagesScope namespaces={pageNamespaces.appointments}>
        <AppointmentsFlow />
      </MessagesScope>
    </main>
  );
}
