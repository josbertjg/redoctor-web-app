import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';

import { isSafeRedirect } from '@/app/lib/routes';

import { SiteHeader } from '@/app/ui/layout/site-header';

import { SignInCard } from '../_components/sign-in-card';

/*
 * `/entrar?redirect=` (M2): the one place to sign in, with Google or Apple,
 * the same accounts as the app (AGENTS.md §1). A link never signs anyone
 * in; the person taps. `redirect` is honored only as a same-origin path.
 * Never indexed: it is a door, not a page.
 */

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth');
  return { title: t('metaTitle'), robots: { index: false, follow: false } };
}

export default async function SignInPage({
  searchParams,
}: PageProps<'/entrar'>) {
  const { redirect } = await searchParams;
  const target =
    typeof redirect === 'string' && isSafeRedirect(redirect) ? redirect : null;
  const t = await getTranslations('common');

  return (
    <>
      <SiteHeader homeLabel={t('homeLabel')} />
      <main className="flex flex-1 flex-col items-center justify-center px-gutter pb-16">
        <SignInCard redirect={target} />
      </main>
    </>
  );
}
