'use client';

import Image from 'next/image';
import Link from 'next/link';

import PersonSearch from '@material-symbols/svg-400/rounded/person_search.svg?svgr';
import Stethoscope from '@material-symbols/svg-400/rounded/stethoscope.svg?svgr';
import WifiOff from '@material-symbols/svg-400/rounded/wifi_off.svg?svgr';
import { useTranslations } from 'next-intl';

import { routes } from '@/app/lib/routes';
import type { FeaturedSpecialists } from '@/app/lib/schemas/search-highlights';
import type { SearchLocation } from '@/app/lib/search/location';
import { searchParamNames } from '@/app/lib/search/query';

import { Button } from '@/app/ui/button';
import { EmptyState } from '@/app/ui/empty-state';
import { Icon } from '@/app/ui/icons';
import type { SearchCatalog } from '@/app/ui/search/search-bar-types';
import { Skeleton } from '@/app/ui/skeleton';
import { SpecialistCard } from '@/app/ui/specialists/specialist-card';

const featuredTitleId = 'search-featured-title';

/*
 * Nothing asked yet: a way to start (REDOC-177). The most booked
 * specialties (the catalog's first when they cannot be read), and the
 * best rated specialists — near the point in the address, nearest ring
 * first, or the national ranking — each one a card to open or to book on.
 */
export function SearchStart({
  topSpecialties,
  featured,
  location,
}: {
  topSpecialties: SearchCatalog;
  featured: FeaturedSpecialists | null;
  location: SearchLocation;
}) {
  const t = useTranslations('search.web');
  const specialists = featured?.specialists ?? [];
  // A ring kept the list near the point: it says where; past 300 km, or
  // without a point, it is the best rated anywhere.
  const near = featured !== null && featured.radiusMeters !== null;
  const featuredTitle = !near
    ? t('featuredTitle')
    : location.kind === 'place'
      ? t('featuredNearPlace', { place: location.label })
      : location.kind === 'area'
        ? t('featuredInMapArea')
        : t('featuredNearYou');
  return (
    <div className="flex flex-col pb-16">
      <EmptyState
        headingLevel={1}
        icon={PersonSearch}
        title={t('startTitle')}
        description={t('startDescription')}
        action={
          topSpecialties.length > 0 ? (
            <ul className="flex flex-wrap justify-center gap-2">
              {topSpecialties.slice(0, 12).map((specialty) => (
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
      {specialists.length > 0 ? (
        <section
          aria-labelledby={featuredTitleId}
          className="mx-auto w-full max-w-content px-gutter"
        >
          <h2 id={featuredTitleId} className="text-title-lg text-text-primary">
            {featuredTitle}
          </h2>
          <ul className="mt-4 flex flex-col gap-3">
            {specialists.map((specialist) => (
              <li key={specialist.id}>
                <SpecialistCard specialist={specialist} headingLevel={3} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
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
