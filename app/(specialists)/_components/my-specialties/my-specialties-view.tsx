'use client';

import Image from 'next/image';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import type { SessionUser } from '@/app/lib/firebase/client';
import { myProfileQueryOptions } from '@/app/lib/queries/specialists';
import { routes } from '@/app/lib/routes';
import {
  byReviewUrgency,
  rejectedSpecialties,
} from '@/app/lib/schemas/specialists';

import { BackLink } from '@/app/ui/back-link';
import { EmptyState } from '@/app/ui/empty-state';
import { Skeleton } from '@/app/ui/skeleton';

import { useSession } from '@/app/hooks/use-session';

import { EditInAppCard } from '../edit-in-app-card';
import { PanelLoadError } from '../panel-load-error';
import { SpecialtiesSupport } from './specialties-support';
import { SpecialtyCard } from './specialty-card';

/*
 * `/panel/specialties` (M14): the app's «Mis especialidades» on the web,
 * read only — every specialty the specialist registered, what asks
 * something of them first (rejected, then in review), each with where its
 * review stands. The emails about the review lead here; registering,
 * correcting and removing stay in the app.
 */
export function MySpecialtiesView() {
  const { user } = useSession();
  if (user === null) return <MySpecialtiesSkeleton />;
  return <SpecialistSpecialties user={user} />;
}

function Header() {
  const t = useTranslations();
  return (
    <header className="flex flex-col gap-2">
      <BackLink href={routes.specialistProfile()} label={t('profile.title')} />
      <h1 className="text-headline-sm text-text-primary">
        {t('mySpecialties.title')}
      </h1>
      <p className="text-body-md text-text-secondary">
        {t('mySpecialties.description')}
      </p>
    </header>
  );
}

function SpecialistSpecialties({ user }: { user: SessionUser }) {
  const t = useTranslations('mySpecialties');
  const profile = useQuery(myProfileQueryOptions(user));

  if (profile.isError) {
    return (
      <div className="flex flex-col gap-6">
        <Header />
        <PanelLoadError
          error={profile.error}
          title={t('loadErrorTitle')}
          description={t('loadErrorDescription')}
          retrying={profile.isFetching}
          onRetry={() => {
            void profile.refetch();
          }}
        />
      </div>
    );
  }
  if (profile.isPending) return <MySpecialtiesSkeleton />;

  // No professional profile yet (`null`): nothing registered.
  const specialties = byReviewUrgency(profile.data?.specialties ?? []);
  const rejected = rejectedSpecialties(specialties).length;

  return (
    <div className="flex flex-col gap-6">
      <Header />
      {specialties.length === 0 ? (
        <EmptyState
          headingLevel={2}
          illustration={
            <Image
              src="/illustrations/no-data-found.svg"
              alt=""
              width={132}
              height={146}
              className="h-auto w-28"
            />
          }
          title={t('emptyTitle')}
          description={t('emptyDescription')}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {specialties.map((specialty) => (
            <li key={specialty.id}>
              <SpecialtyCard specialty={specialty} />
            </li>
          ))}
        </ul>
      )}
      {rejected > 0 ? <SpecialtiesSupport rejectedCount={rejected} /> : null}
      <EditInAppCard
        title={t('editInApp.title')}
        description={t('editInApp.description')}
        path={routes.specialties()}
      />
    </div>
  );
}

/* While it loads: the header's room and two cards, no words (the layout may show it outside the page's messages). */
export function MySpecialtiesSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-11 w-28" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-5 w-full max-w-md" />
      </div>
      <Skeleton className="h-44 rounded-2xl" />
      <Skeleton className="h-44 rounded-2xl" />
    </div>
  );
}
