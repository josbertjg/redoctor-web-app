import Image from 'next/image';
import Link from 'next/link';

import { getTranslations } from 'next-intl/server';

import { routes } from '@/app/lib/routes';

import { Button } from '@/app/ui/button';
import { EmptyState } from '@/app/ui/empty-state';
import { SiteHeader } from '@/app/ui/layout/site-header';
import { PageTransition } from '@/app/ui/motion/view-transitions';

/*
 * A profile that does not exist (deleted, or a broken link): a real 404,
 * since the page reads the profile before anything goes out (AGENTS.md §4).
 * As in the app, nothing here can fix it, so there is no retry: a way home,
 * where the search box is (M16).
 */
export default async function SpecialistNotFound() {
  const t = await getTranslations();

  return (
    <>
      <SiteHeader homeLabel={t('common.homeLabel')} />
      <PageTransition>
        <main className="flex flex-1 flex-col justify-center pb-16">
          <EmptyState
            headingLevel={1}
            illustration={
              <Image
                src="/illustrations/no-data-found.svg"
                alt=""
                width={132}
                height={146}
                preload
                className="h-auto w-32"
              />
            }
            title={t('specialists.notFound.title')}
            description={t('specialists.notFound.description')}
            action={
              <Button asChild>
                <Link href={routes.home()}>{t('not_found.go_home')}</Link>
              </Button>
            }
          />
        </main>
      </PageTransition>
    </>
  );
}
