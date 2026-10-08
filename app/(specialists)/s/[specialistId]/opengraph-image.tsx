import { notFound } from 'next/navigation';
import { ImageResponse } from 'next/og';

import { getTranslations } from 'next-intl/server';

import { fetchImageAsDataUri } from '@/app/lib/data/images';
import { getSpecialistProfile } from '@/app/lib/data/specialists';
import { initialsOf } from '@/app/lib/format/names';
import { defaultLocale } from '@/app/lib/i18n/config';
import messages from '@/app/lib/i18n/messages/es.json';
import { sizedPhotoUrl } from '@/app/lib/photos';

import { ogFonts, ogSize } from '@/app/ui/og/brand-card';

import { SpecialistOgCard } from '../../_components/specialist-og-card';

/*
 * The preview when a profile is shared (WhatsApp, Instagram): photo, name and
 * verified specialties. A profile is public, so a rich preview is fine here,
 * unlike /i and /a (AGENTS.md §6).
 */
export const alt = messages.specialists.ogImageAlt;
export const size = ogSize;
export const contentType = 'image/png';

export default async function SpecialistOpenGraphImage({
  params,
}: {
  params: Promise<{ specialistId: string }>;
}) {
  const { specialistId } = await params;
  const profile = await getSpecialistProfile(specialistId);
  if (!profile) notFound();

  const t = await getTranslations({ locale: defaultLocale });
  // 2x the 220 px portrait of the card.
  const photo = profile.photoUrl
    ? await fetchImageAsDataUri(sizedPhotoUrl(profile.photoUrl, 440))
    : null;
  const [first, second, ...rest] = profile.specialties.map(
    (specialty) => specialty.name,
  );
  const specialties = [first, second].filter(Boolean).join(' · ');

  return new ImageResponse(
    <SpecialistOgCard
      name={profile.name}
      specialties={
        rest.length > 0
          ? `${specialties} ${t('search.specialtiesCount', { count: rest.length })}`
          : specialties
      }
      verifiedLabel={
        profile.verified ? t('search.verifiedSpecialist') : undefined
      }
      photo={photo}
      initials={initialsOf(profile.name)}
    />,
    { ...size, fonts: ogFonts },
  );
}
