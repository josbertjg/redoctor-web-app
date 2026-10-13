import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';

import { pageNamespaces } from '@/app/lib/i18n/client-messages';

import { AppAccess } from '@/app/ui/app-bridge/app-access';
import { MessagesScope } from '@/app/ui/messages-scope';

import { MySpecialtiesView } from '../../_components/my-specialties/my-specialties-view';
import { SpecialistHomeSwitch } from '../../_components/specialist-home-switch';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('mySpecialties');
  return { title: t('metaTitle'), robots: { index: false, follow: false } };
}

/*
 * `/panel/specialties` (M14): «Mis especialidades», each specialty and
 * where its review stands — the emails about the review (16) lead here. On
 * a phone with the app the same link opens the app's own screen; a sign-up
 * still open is finished in the app.
 */
export default function MySpecialtiesPage() {
  return (
    <MessagesScope namespaces={pageNamespaces.mySpecialties}>
      <SpecialistHomeSwitch
        ready={<MySpecialtiesView />}
        pending={<AppAccess variant="finish" className="mx-auto mt-6" />}
      />
    </MessagesScope>
  );
}
