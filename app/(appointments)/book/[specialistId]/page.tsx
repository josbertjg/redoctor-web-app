import type { Metadata } from 'next';

import { notFound } from 'next/navigation';

import { getTranslations } from 'next-intl/server';

import { getSpecialistProfile } from '@/app/lib/data/specialists';
import { getSpecialtiesTree } from '@/app/lib/data/specialties';
import { pageNamespaces } from '@/app/lib/i18n/client-messages';
import { bookingSpecialtyId } from '@/app/lib/schemas/booking';
import { brandOpenGraph } from '@/app/lib/site';

import { MessagesScope } from '@/app/ui/messages-scope';

import { BookingFlow } from '../../_components/booking/booking-flow';

/*
 * `/book/{specialistId}` (M15): a patient books with the specialist of a
 * public profile, as the app's booking sheet does. The web's own page, out
 * of `/s/*` — which the app claims, and where it has no booking path —, so
 * it opens here with the app or without it (AGENTS.md §6). The profile and
 * the catalog are public and read on the server, cached; the rest needs
 * the patient's session and is read in the browser (§4). Never indexed.
 */

export async function generateMetadata(): Promise<Metadata> {
  const [t, site] = await Promise.all([
    getTranslations('appointments.book'),
    getTranslations('metadata'),
  ]);
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    robots: { index: false, follow: false },
    openGraph: brandOpenGraph({
      title: t('metaTitle'),
      description: t('metaDescription'),
      siteName: site('siteName'),
      imageAlt: site('ogImageAlt'),
    }),
  };
}

export default async function BookPage({
  params,
}: PageProps<'/book/[specialistId]'>) {
  const { specialistId } = await params;
  const profile = await getSpecialistProfile(specialistId);
  if (!profile) notFound();

  const [tree, notice] = await Promise.all([
    getSpecialtiesTree(),
    getTranslations('profile.preview.notice'),
  ]);

  return (
    <main className="flex flex-1 flex-col">
      <MessagesScope namespaces={pageNamespaces.book}>
        <BookingFlow
          specialist={{
            id: profile.id,
            name: profile.name,
            photoUrl: profile.photoUrl,
            verified: profile.verified,
            specialties: profile.specialties.map((specialty) => specialty.name),
            offices: profile.offices.map((office) => ({
              id: office.id,
              name: office.name,
              address: office.address,
              description: office.description,
            })),
          }}
          specialtyId={bookingSpecialtyId(profile.specialties, tree)}
          ownerNotice={{
            title: notice('title'),
            description: notice('book'),
          }}
        />
      </MessagesScope>
    </main>
  );
}
