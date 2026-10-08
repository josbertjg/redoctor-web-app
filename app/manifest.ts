import type { MetadataRoute } from 'next';

import { getTranslations } from 'next-intl/server';

import { colorToken } from '@/app/lib/design-tokens';
import { defaultLocale } from '@/app/lib/i18n/config';

/*
 * Browser display on purpose: the installable experience is the mobile app;
 * a home-screen shortcut to the web just opens the browser.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getTranslations({
    locale: defaultLocale,
    namespace: 'metadata',
  });

  return {
    name: t('siteName'),
    short_name: t('siteName'),
    description: t('description'),
    lang: defaultLocale,
    start_url: '/',
    display: 'browser',
    background_color: colorToken('white-50'),
    theme_color: colorToken('blue-500'),
    icons: [
      { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
