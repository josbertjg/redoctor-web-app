import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';

import { getSupportContact } from '@/app/lib/data/support';
import { pageNamespaces } from '@/app/lib/i18n/client-messages';

import { AppAccess } from '@/app/ui/app-bridge/app-access';
import { MessagesScope } from '@/app/ui/messages-scope';
import { PageTransition } from '@/app/ui/motion/view-transitions';

import { AdminNote } from '../_components/admin-note';
import { PanelHome } from '../_components/panel-home';
import { SpecialistHomeSwitch } from '../_components/specialist-home-switch';

/*
 * `/panel` (M14): where a specialist lands after signing in, and the home
 * of their panel, as the designer drew it on the blue (2026-10-30) with
 * the app's home rules (`PanelHome`). A specialist whose sign-up is still
 * open is shown the way to finish it in the app instead (M3); an admin's
 * account, the note that its tools are in the app. Never indexed.
 */

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('panel.home');
  return { title: t('metaTitle'), robots: { index: false, follow: false } };
}

export default async function SpecialistHomePage() {
  const [t, support] = await Promise.all([
    getTranslations(),
    getSupportContact(),
  ]);

  return (
    <PageTransition>
      <MessagesScope namespaces={pageNamespaces.panelHome}>
        <SpecialistHomeSwitch
          ready={
            <PanelHome
              adminNote={<AdminNote message={t('specialistHome.adminNote')} />}
            />
          }
          pending={
            <AppAccess
              variant="finish"
              support={support}
              className="mx-auto mt-6"
            />
          }
        />
      </MessagesScope>
    </PageTransition>
  );
}
