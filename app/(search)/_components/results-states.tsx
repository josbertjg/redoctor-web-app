'use client';

import Image from 'next/image';
import Link from 'next/link';

import PersonSearch from '@material-symbols/svg-400/rounded/person_search.svg?svgr';
import Stethoscope from '@material-symbols/svg-400/rounded/stethoscope.svg?svgr';
import WifiOff from '@material-symbols/svg-400/rounded/wifi_off.svg?svgr';
import { useTranslations } from 'next-intl';

import { routes } from '@/app/lib/routes';
import { searchParamNames } from '@/app/lib/search/query';

import { Button } from '@/app/ui/button';
import { EmptyState } from '@/app/ui/empty-state';
import { Icon } from '@/app/ui/icons';
import type { SearchCatalog } from '@/app/ui/search/search-bar-types';
import { Skeleton } from '@/app/ui/skeleton';

/** Nothing asked yet: the catalog as a way to start. */
export function SearchStart({ catalog }: { catalog: SearchCatalog }) {
  const t = useTranslations('search.web');
  return (
    <EmptyState
      headingLevel={1}
      icon={PersonSearch}
      title={t('startTitle')}
      description={t('startDescription')}
      action={
        catalog.length > 0 ? (
          <ul className="flex flex-wrap justify-center gap-2">
            {catalog.slice(0, 12).map((specialty) => (
              <li key={specialty.id}>
                <Link
                  href={routes.search(
                    new URLSearchParams({
                      [searchParamNames.specialty]: specialty.id,
                    }),
                  )}
                  className="inline-flex min-h-touch items-center gap-1.5 rounded-full border border-divider bg-pure-white px-4 text-label-lg text-primary transition-[background-color,border-color] duration-fast ease-house outline-none hover:border-primary hover:bg-info-light focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <Icon icon={Stethoscope} size={16} />
                  {specialty.name}
                </Link>
              </li>
            ))}
          </ul>
        ) : undefined
      }
    />
  );
}

/** The app's «Vaya, no encontramos coincidencias», with the way to widen. */
export function SearchEmpty({
  canWiden,
  onWiden,
}: {
  canWiden: boolean;
  onWiden: () => void;
}) {
  const t = useTranslations('search');
  return (
    <EmptyState
      headingLevel={1}
      illustration={
        <Image
          src="/illustrations/no-data-found.svg"
          alt=""
          width={160}
          height={160}
          className="h-40 w-auto"
        />
      }
      title={t('specialistsNotFoundTitle')}
      description={t('specialistsNotFoundDescription')}
      action={
        canWiden ? (
          <Button variant="white" onClick={onWiden}>
            {t('web.widen')}
          </Button>
        ) : undefined
      }
    />
  );
}

/** The search could not be read: the way to try again. */
export function SearchFailed({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations();
  return (
    <EmptyState
      headingLevel={1}
      tone="error"
      icon={WifiOff}
      title={t('search.web.loadFailed')}
      action={<Button onClick={onRetry}>{t('retry')}</Button>}
    />
  );
}

/** A card's shape while its specialist is on the way. */
export function ResultCardSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-pure-white p-4 shadow-md">
      <div className="flex gap-4">
        <Skeleton className="size-16 rounded-full" />
        <div className="flex flex-1 flex-col gap-2 py-1">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-3/5" />
        </div>
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-14 w-18" />
        ))}
      </div>
    </div>
  );
}

export function ResultsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3">
      {Array.from({ length: count }, (_, index) => (
        <ResultCardSkeleton key={index} />
      ))}
    </div>
  );
}
