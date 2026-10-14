import Image from 'next/image';
import Link from 'next/link';

import { getTranslations } from 'next-intl/server';

import { routes } from '@/app/lib/routes';

import { Button } from '@/app/ui/button';
import { EmptyState } from '@/app/ui/empty-state';

/*
 * A booking for a profile that does not exist (deleted, or a broken link):
 * the public profile's own words, with the way home. Under the module's bar,
 * which the layout draws. No loading state above it, so it is a real 404.
 */
export default async function BookingNotFound() {
  const t = await getTranslations();

  return (
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
  );
}
