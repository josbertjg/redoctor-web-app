import { ImageResponse } from 'next/og';

import { getTranslations } from 'next-intl/server';

import { defaultLocale } from '@/app/lib/i18n/config';
import messages from '@/app/lib/i18n/messages/es.json';

import { BrandCard, ogFonts, ogSize } from '@/app/ui/og/brand-card';

/*
 * The default preview when someone shares redoctorapp.com. Provisional until
 * the designer's 1200×630 image (logo, hero phrase, phone with a confirmed
 * appointment) exists. Private links (/i, /a) use it too: it names no one.
 */
export const alt = messages.metadata.ogImageAlt;
export const size = ogSize;
export const contentType = 'image/png';

export default async function OpenGraphImage() {
  const t = await getTranslations({ locale: defaultLocale });

  return new ImageResponse(
    <BrandCard
      title={t('metadata.tagline')}
      subtitle={t('landing.footer.tagline')}
    />,
    { ...size, fonts: ogFonts },
  );
}
