import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';

import { pageNamespaces } from '@/app/lib/i18n/client-messages';

import { AppAccess } from '@/app/ui/app-bridge/app-access';
import { MessagesScope } from '@/app/ui/messages-scope';
import { PageTransition } from '@/app/ui/motion/view-transitions';

import { AdminNote } from '../_components/admin-note';
import { PanelGreeting } from '../_components/panel-greeting';
import {
  PanelProfileLinks,
  PanelStatisticsCard,
} from '../_components/panel-links';
import { PanelPlanCard } from '../_components/panel-plan-card';
import { PanelTodayCard } from '../_components/panel-today-card';
import { SpecialistHomeSwitch } from '../_components/specialist-home-switch';
import { SpecialistOnly } from '../_components/specialist-only';

/*
 * `/panel` (M14): where a specialist lands after signing in, and the home
 * of their panel, as the app's home: the plan and what it asks for first,
 * today's patients, and the statistics and the profile one card away. A
 * specialist whose sign-up is still open is shown the way to finish it in
 * the app instead (M3); an admin's account, the note that its tools are in
 * the app. Never indexed.
 */

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('panel.home');
  return { title: t('metaTitle'), robots: { index: false, follow: false } };
}

export default async function SpecialistHomePage() {
  const t = await getTranslations();

  return (
    <PageTransition>
      <MessagesScope namespaces={pageNamespaces.panelHome}>
        <SpecialistHomeSwitch
          ready={
            <div className="flex flex-col gap-6">
              <header className="flex flex-col gap-2">
                <PanelGreeting />
                <p className="text-body-md text-text-secondary">
                  {t('panel.home.description')}
                </p>
                <AdminNote
                  message={t('specialistHome.adminNote')}
                  className="mt-2"
                />
              </header>
              <SpecialistOnly>
                {/* The cards keep one rhythm: 16 px apart, as in the grid. */}
                <div className="flex flex-col gap-4">
                  <div className="grid items-start gap-4 lg:grid-cols-2">
                    <PanelPlanCard />
                    <PanelTodayCard />
                  </div>
                  <PanelStatisticsCard />
                </div>
                <PanelProfileLinks />
              </SpecialistOnly>
            </div>
          }
          pending={<AppAccess variant="finish" className="mx-auto mt-6" />}
        />
      </MessagesScope>
    </PageTransition>
  );
}
