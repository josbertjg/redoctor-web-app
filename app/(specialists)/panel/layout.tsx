import { getTranslations } from 'next-intl/server';

import { routes } from '@/app/lib/routes';

import { RequireSession } from '@/app/ui/auth/require-session';
import { SessionButton } from '@/app/ui/auth/session-button';
import { PageFrame } from '@/app/ui/layout/page-frame';
import { SiteHeader } from '@/app/ui/layout/site-header';

import { SpecialistHomeSkeleton } from '../_components/specialist-home-skeleton';

/*
 * The specialist's area needs a session with the specialist facet (or an
 * admin's account): the skeleton stands until `/me` answers, a signed-out
 * person goes to sign in and comes back, a patient gets a way out.
 */
export default async function SpecialistAreaLayout({
  children,
}: LayoutProps<'/panel'>) {
  const t = await getTranslations('common');

  return (
    <>
      <SiteHeader homeLabel={t('homeLabel')}>
        <SessionButton redirect={routes.specialistHome()} />
      </SiteHeader>
      <PageFrame width="content">
        <RequireSession
          facet="specialist"
          fallback={<SpecialistHomeSkeleton />}
        >
          {children}
        </RequireSession>
      </PageFrame>
    </>
  );
}
