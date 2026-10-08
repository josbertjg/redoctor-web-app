import type { Metadata } from 'next';

import Image from 'next/image';
import Link from 'next/link';

import { getTranslations } from 'next-intl/server';

import { routes } from '@/app/lib/routes';

import { Button } from '@/app/ui/button';
import { EmptyState } from '@/app/ui/empty-state';
import { SiteHeader } from '@/app/ui/layout/site-header';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('not_found');
  return { title: t('metaTitle') };
}

/*
 * Any URL the web does not know. Composition of the app's NOT FOUND screen
 * (Figma), copy of the landing doc. «Ver mis citas» joins when /citas exists
 * (M6).
 */
export default async function NotFound() {
  const t = await getTranslations();

  return (
    <>
      <SiteHeader homeLabel={t('common.homeLabel')} />
      <main className="flex flex-1 flex-col justify-center pb-16">
        <EmptyState
          headingLevel={1}
          illustration={
            <Image
              src="/illustrations/not-found.svg"
              alt=""
              width={301}
              height={191}
              preload
              className="h-auto w-56"
            />
          }
          title={t('not_found.title')}
          description={t('not_found.description')}
          action={
            <Button asChild>
              <Link href={routes.home()}>{t('not_found.go_home')}</Link>
            </Button>
          }
        />
      </main>
    </>
  );
}
