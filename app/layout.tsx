import type { Metadata, Viewport } from 'next';

import { connection } from 'next/server';

import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';

import { pickClientMessages } from '@/app/lib/i18n/client-messages';
import { isIndexable, siteUrl } from '@/app/lib/site';
import { cn } from '@/app/lib/utils';

import { urbanist } from '@/app/ui/fonts';

import { Providers } from './providers';

import '@/app/ui/globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata');

  return {
    metadataBase: siteUrl,
    title: { default: t('title'), template: `%s · ${t('siteName')}` },
    description: t('description'),
    applicationName: t('siteName'),
    openGraph: {
      type: 'website',
      locale: 'es_VE',
      siteName: t('siteName'),
      title: t('title'),
      description: t('description'),
    },
    twitter: { card: 'summary_large_image' },
    formatDetection: { telephone: false, email: false, address: false },
    // Previews and local builds never reach search results.
    ...(isIndexable ? {} : { robots: { index: false, follow: false } }),
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Lets bottom actions respect the safe area on notched phones.
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  // The CSP nonce (proxy.ts) exists per request: every page renders per request.
  await connection();
  const [t, messages] = await Promise.all([getTranslations(), getMessages()]);

  return (
    // data-theme="light": the dark aliases of tokens.css stay defined but off,
    // as in the app, until a theme toggle exists (AGENTS.md §7).
    <html
      lang="es"
      data-theme="light"
      className={cn(
        urbanist.variable,
        'h-full antialiased motion-safe:scroll-smooth',
      )}
    >
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider messages={pickClientMessages(messages)}>
          <Providers
            toasterLabels={{
              region: t('notifications.title'),
              close: t('close'),
            }}
            networkNotice={t('apiErrors.network')}
          >
            {children}
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
