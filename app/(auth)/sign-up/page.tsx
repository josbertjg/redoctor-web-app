import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';

import { pageNamespaces } from '@/app/lib/i18n/client-messages';
import { isSafeRedirect } from '@/app/lib/routes';

import { AppAccess } from '@/app/ui/app-bridge/app-access';
import { SessionControls } from '@/app/ui/auth/session-controls';
import { SiteHeader } from '@/app/ui/layout/site-header';
import { MessagesScope } from '@/app/ui/messages-scope';

import { SignUpFlow } from '../_components/sign-up-flow';

/*
 * `/sign-up?redirect=` (M3): the sign-up of an account that signed in with
 * no sign-up behind it, patients only (owner's scope, 2026-10-12). It
 * needs a session — a stranger goes to sign in and comes back here, query
 * included. Never indexed.
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
  const t = await getTranslations('common');

  return (
    <>
      <SiteHeader homeLabel={t('homeLabel')}>
        <SessionControls />
      </SiteHeader>
      <main className="flex flex-1 flex-col items-center justify-center px-gutter pb-16">
        <MessagesScope namespaces={pageNamespaces.signUp}>
          <SignUpFlow
            redirect={target}
            joinApp={<AppAccess variant="join" />}
            finishApp={<AppAccess variant="finish" />}
          />
        </MessagesScope>
      </main>
    </>
  );
}
