import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';

import { pageNamespaces } from '@/app/lib/i18n/client-messages';

import { AppAccess } from '@/app/ui/app-bridge/app-access';
import { MessagesScope } from '@/app/ui/messages-scope';
import { PageTransition } from '@/app/ui/motion/view-transitions';

import { MyProfileView } from '../../_components/my-profile/my-profile-view';
import { SpecialistHomeSwitch } from '../../_components/specialist-home-switch';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('profile');
  return { title: t('metaTitle'), robots: { index: false, follow: false } };
}

/*
 * `/panel/profile` (M14): «Mi perfil», what patients see of the specialist
 * and whether they find them in the search — the email «Perfil no visible»
 * (18) leads here. On a phone with the app the same link opens the app's
 * «Perfil»; a sign-up still open is finished in the app.
 */
export default function MyProfilePage() {
  return (
    <PageTransition>
      <MessagesScope namespaces={pageNamespaces.myProfile}>
        <SpecialistHomeSwitch
          ready={<MyProfileView />}
          pending={<AppAccess variant="finish" className="mx-auto mt-6" />}
        />
      </MessagesScope>
    </PageTransition>
  );
}
