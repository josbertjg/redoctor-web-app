import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';

import { getSupportContact } from '@/app/lib/data/support';
import { pageNamespaces } from '@/app/lib/i18n/client-messages';
import { isSafeRedirect } from '@/app/lib/routes';

import { AppAccess } from '@/app/ui/app-bridge/app-access';
import { MessagesScope } from '@/app/ui/messages-scope';
import { PageTransition } from '@/app/ui/motion/view-transitions';

import { SignUpFlow } from '../_components/sign-up-flow';

/*
 * `/sign-up?as=&redirect=` (M3): who the person is, the account — Google or
 * Apple, made right here —, then the form of the role chosen: a patient's,
 * or since 2026-11-03 a specialist's, whose sign-up the app finishes. An
 * account with no sign-up behind it is sent here from every other page.
 * Never indexed.
 */

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('signUp');
  return { title: t('metaTitle'), robots: { index: false, follow: false } };
}

export default async function SignUpPage({
  searchParams,
}: PageProps<'/sign-up'>) {
  const { redirect } = await searchParams;
  const target =
    typeof redirect === 'string' && isSafeRedirect(redirect) ? redirect : null;
  const support = await getSupportContact();

  return (
    <PageTransition>
      <main className="flex flex-1 flex-col items-center justify-center px-gutter pt-4 pb-16">
        <MessagesScope namespaces={pageNamespaces.signUp}>
          <SignUpFlow
            redirect={target}
            finishApp={<AppAccess variant="finish" support={support} />}
            createdApp={<AppAccess variant="created" support={support} />}
          />
        </MessagesScope>
      </main>
    </PageTransition>
  );
}
