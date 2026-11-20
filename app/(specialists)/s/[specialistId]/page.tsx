import { cache } from 'react';

import type { Metadata } from 'next';

import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';

import { getFormatter, getTranslations } from 'next-intl/server';

import { smartAppBanner } from '@/app/lib/app-bridge';
import { panelHintCookie } from '@/app/lib/auth/session-hint';
import { getSpecialistProfile as readSpecialistProfile } from '@/app/lib/data/specialists';
import { pageNamespaces } from '@/app/lib/i18n/client-messages';
import { routes } from '@/app/lib/routes';
import { bookingSpecialtyId } from '@/app/lib/schemas/booking';
import { specialistJsonLd } from '@/app/lib/seo/specialist';
import { absoluteUrl, landingSections } from '@/app/lib/site';

import { LinkOriginTracker } from '@/app/ui/analytics/link-origin-tracker';
import { OpenInAppButton } from '@/app/ui/app-bridge/open-in-app-button';
import { Swirl } from '@/app/ui/decor';
import { BottomActions } from '@/app/ui/layout/bottom-actions';
import { SiteBar } from '@/app/ui/layout/site-bar';
import { MessagesScope } from '@/app/ui/messages-scope';
import { PageTransition } from '@/app/ui/motion/view-transitions';
import { JsonLd } from '@/app/ui/seo/json-ld';

import { BookButton } from '../../_components/profile-booking/book-button';
import { BookingDialog } from '../../_components/profile-booking/booking-dialog';
import { BookingPanel } from '../../_components/profile-booking/booking-panel';
import { ProfileBookingProvider } from '../../_components/profile-booking/profile-booking';
import { profileMetaWords } from '../../_components/profile-metadata';
import {
  ProfileContent,
  profileSections,
} from '../../_components/public-profile/profile-content';
import { ProfileHeader } from '../../_components/public-profile/profile-header';
import { ProfileTabs } from '../../_components/public-profile/profile-tabs';

/*
 * The public profile (M8), as the designer drew it (Figma, 2026-11-16, the
 * owner's «Perfil público del especialista: implementar»): the site's bar on
 * the blue; the profile's header card with its tabs and the content card;
 * and beside them, from laptops up, the booking — the specialist's real
 * agenda, public —, whose «Agendar» opens the modal with the rest. On a
 * phone the booking is the modal's from its first step («Agendar cita»).
 * Rendered on the server (no CORS, cached for every visitor); the booking
 * reads the agenda in the browser.
 *
 * The profile is read before anything goes out and nothing loads above the
 * page, so an unknown id is a real 404 (AGENTS.md §4), as on `/book`; the
 * reviews alone stream in behind it, under their own Suspense. For search
 * engines the page carries its structured data (schema.org) and a title
 * and description built from the profile; the sitemap lists it.
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

  const [t, format] = await Promise.all([getTranslations(), getFormatter()]);
  const path = routes.specialist(profile.id);
  const { title, description } = profileMetaWords(profile, {
    t: (key, values) => t(key as Parameters<typeof t>[0], values),
    list: (items) => format.list(items, { type: 'conjunction' }),
    number: (value) =>
      format.number(value, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
  });

  return {
    title,
    description,
    // Canonical without `?origin=`: the channel tag never travels further.
    alternates: { canonical: path },
    openGraph: {
      type: 'profile',
      siteName: t('metadata.siteName'),
      locale: 'es_VE',
      title,
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
  // A specialist's browser: booking waits for the session (useBookingOffer).
  const expectSpecialist =
    (await cookies()).get(panelHintCookie)?.value === '1';
  const notice = await getTranslations('profile.preview.notice');
  const landing = (section: string) => `${routes.home()}#${section}`;

  return (
    <>
      <JsonLd
        data={specialistJsonLd(
          profile,
          absoluteUrl(routes.specialist(profile.id)),
        )}
      />
      <LinkOriginTracker link="specialist" />
      {/* The page clips its background shape at its own edges (`clip`
          keeps the tabs and the booking sticky). */}
      <div className="relative isolate flex flex-1 flex-col overflow-clip bg-primary">
        <Swirl
          variant="bg-1"
          className="top-[-14rem] left-[-15rem] w-[110rem]"
        />
        <SiteBar
          links={[
            {
              href: landing(landingSections.howItWorks),
              label: t('landing.nav.specialists'),
            },
            {
              href: landing(landingSections.pricing),
              label: t('landing.nav.plans'),
            },
            { href: landing(landingSections.faq), label: t('landing.nav.faq') },
          ]}
          labels={{
            home: t('common.homeLabel'),
            nav: t('landing.nav.label'),
            openMenu: t('landing.nav.openMenu'),
            closeMenu: t('landing.nav.closeMenu'),
          }}
        />
        <PageTransition>
          <main className="flex flex-1 flex-col">
            <MessagesScope namespaces={pageNamespaces.specialistProfile}>
              <ProfileBookingProvider
                specialist={{
                  id: profile.id,
                  name: profile.name,
                  photoUrl: profile.photoUrl,
                  verified: profile.verified,
                  specialties: profile.specialties.map(
                    (specialty) => specialty.name,
                  ),
                  offices: profile.offices.map((office) => ({
                    id: office.id,
                    name: office.name,
                    address: office.address,
                    description: office.description,
                    reasons: office.reasons,
                  })),
                }}
                specialtyId={bookingSpecialtyId(profile.specialties)}
                ownerNotice={{
                  title: notice('title'),
                  description: notice('book'),
                }}
                expectSpecialist={expectSpecialist}
              >
                {/* The bar's own width and edges (the landing's 79rem
                    inside the gutter), as drawn. */}
                <div className="px-gutter pt-6 pb-28 sm:pt-9 lg:pb-16">
                  <div className="mx-auto grid w-full max-w-landing items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,29.5rem)]">
                    <div className="flex min-w-0 flex-col">
                      <ProfileHeader profile={profile} />
                      <ProfileTabs
                        label={t('specialists.sectionsLabel')}
                        sections={[
                          {
                            id: profileSections.description,
                            title: t('description'),
                          },
                          {
                            id: profileSections.reviews,
                            title: t('reviews.title'),
                          },
                          {
                            id: profileSections.about,
                            title: t('specialistProfile.aboutSpecialist'),
                          },
                        ]}
                      />
                      <ProfileContent profile={profile} />
                    </div>
                    {/* Beside the profile while it scrolls; taller than the
                      screen, it scrolls within. */}
                    <aside className="hidden overscroll-contain lg:sticky lg:top-6 lg:block lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto lg:rounded-xl">
                      <BookingPanel titleId="booking-panel-title" />
                    </aside>
                  </div>
                </div>
                <BookingDialog />
                <BottomActions className="lg:hidden">
                  {/* Above the booking: on a computer it gives its place
                      up, and «Agendar cita» stays where it is. */}
                  <OpenInAppButton
                    path={routes.specialist(profile.id)}
                    desktop="none"
                    variant="white"
                  />
                  <BookButton className="w-full" />
                </BottomActions>
              </ProfileBookingProvider>
            </MessagesScope>
          </main>
        </PageTransition>
      </div>
    </>
  );
}
