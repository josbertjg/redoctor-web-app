import { cache, Suspense } from 'react';

import type { Metadata } from 'next';

import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';

import { getTranslations } from 'next-intl/server';

import { smartAppBanner } from '@/app/lib/app-bridge';
import { panelHintCookie } from '@/app/lib/auth/session-hint';
import { getSpecialistProfile as readSpecialistProfile } from '@/app/lib/data/specialists';
import { routes } from '@/app/lib/routes';

import { LinkOriginTracker } from '@/app/ui/analytics/link-origin-tracker';
import { OpenInAppButton } from '@/app/ui/app-bridge/open-in-app-button';
import { BottomActions } from '@/app/ui/layout/bottom-actions';
import { SiteHeader } from '@/app/ui/layout/site-header';
import { Tabs } from '@/app/ui/tabs';

import { BookingNote } from '../../_components/booking-note';
import { CertificationList } from '../../_components/certification-list';
import { Gallery } from '../../_components/gallery';
import { OfficeList } from '../../_components/office-list';
import { OFFICES_ANCHOR, ProfileHero } from '../../_components/profile-hero';
import {
  ProfilePlaceholder,
  ProfileSection,
} from '../../_components/profile-section';
import { ReviewsSkeleton } from '../../_components/profile-skeletons';
import { ReviewsSection } from '../../_components/reviews-section';
import { ShowMoreText } from '../../_components/show-more-text';
import { SpecialtyList } from '../../_components/specialty-list';

/*
 * The public profile (M8): what the app's specialist screen shows, read-only,
 * rendered on the server (no CORS, cached for every visitor). Booking,
 * availability and prices stay out of the pilot: prices wait for services in
 * the public profile (REDOC-367).
 */

/*
 * One read of the profile per request, shared by the metadata and the page:
 * the API client passes an abort signal, which keeps Next from deduplicating
 * the two fetches by itself, and every server-side call counts against the
 * API's 100 per minute from Vercel's addresses (AGENTS.md §5).
 */
const getSpecialistProfile = cache(readSpecialistProfile);

export async function generateMetadata({
  params,
}: PageProps<'/s/[specialistId]'>): Promise<Metadata> {
  const { specialistId } = await params;
  const profile = await getSpecialistProfile(specialistId);
  if (!profile) notFound();

  const t = await getTranslations();
  const path = routes.specialist(profile.id);
  const description = t('specialists.metaDescription', { name: profile.name });

  return {
    title: profile.name,
    description,
    // Canonical without `?origin=`: the channel tag never travels further.
    alternates: { canonical: path },
    openGraph: {
      type: 'profile',
      siteName: t('metadata.siteName'),
      locale: 'es_VE',
      title: profile.name,
      description,
      url: path,
    },
    ...smartAppBanner(path),
  };
}

export default async function SpecialistProfilePage({
  params,
}: PageProps<'/s/[specialistId]'>) {
  const { specialistId } = await params;
  const profile = await getSpecialistProfile(specialistId);
  if (!profile) notFound();

  const t = await getTranslations();
  const moreLabels = { more: t('readMore'), less: t('showLess') };
  // A specialist's browser: the booking line waits for the session (BookingNote).
  const expectSpecialist =
    (await cookies()).get(panelHintCookie)?.value === '1';
  const hasAbout = profile.gallery.length > 0 || profile.experience !== null;

  return (
    <>
      <LinkOriginTracker link="specialist" />
      <div className="bg-primary">
        <SiteHeader homeLabel={t('common.homeLabel')} tone="inverse" />
      </div>
      <main className="flex flex-1 flex-col">
        <ProfileHero profile={profile} />
        <div className="mx-auto flex w-full max-w-content flex-col gap-8 px-gutter py-6">
          <ProfileSection title={t('description')}>
            {profile.description ? (
              <ShowMoreText
                text={profile.description}
                limit={200}
                labels={moreLabels}
              />
            ) : (
              <ProfilePlaceholder>
                {t('search.noDescription')}
              </ProfilePlaceholder>
            )}
          </ProfileSection>

          <ProfileSection
            id={OFFICES_ANCHOR}
            title={t('search.attentionOffices')}
          >
            {profile.offices.length > 0 ? (
              <OfficeList offices={profile.offices} />
            ) : (
              <ProfilePlaceholder>
                {t('specialists.noOffices')}
              </ProfilePlaceholder>
            )}
          </ProfileSection>

          <ProfileSection title={t('reviews.title')}>
            <Suspense fallback={<ReviewsSkeleton />}>
              <ReviewsSection
                specialistId={profile.id}
                specialistName={profile.name}
              />
            </Suspense>
          </ProfileSection>

          <ProfileSection title={t('specialistProfile.aboutSpecialist')}>
            {hasAbout ? (
              <div className="flex flex-col gap-3">
                {profile.gallery.length > 0 ? (
                  <Gallery images={profile.gallery} name={profile.name} />
                ) : null}
                {profile.experience ? (
                  <ShowMoreText
                    text={profile.experience}
                    limit={300}
                    labels={moreLabels}
                  />
                ) : null}
              </div>
            ) : (
              <ProfilePlaceholder>
                {t('search.noAboutSpecialist')}
              </ProfilePlaceholder>
            )}
          </ProfileSection>

          <Tabs
            label={t('specialists.trainingLabel', { name: profile.name })}
            items={[
              {
                value: 'education',
                label: t('education'),
                content: <SpecialtyList specialties={profile.specialties} />,
              },
              {
                value: 'certifications',
                label: t('certifications'),
                content: (
                  <CertificationList certifications={profile.certifications} />
                ),
              },
            ]}
          />
        </div>

        <BottomActions>
          <BookingNote
            specialistId={profile.id}
            patientNote={t('specialists.bookingSoon')}
            ownNote={t('specialists.ownProfileNote')}
            expectSpecialist={expectSpecialist}
          />
          <OpenInAppButton path={routes.specialist(profile.id)} />
        </BottomActions>
      </main>
    </>
  );
}
