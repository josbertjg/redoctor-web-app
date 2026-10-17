import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';

import { routes } from '@/app/lib/routes';
import { brandOpenGraph } from '@/app/lib/site';

import { PageTransition } from '@/app/ui/motion/view-transitions';

import { LegalDocument } from '../_components/legal-document';
import { privacySections } from '../_data/legal-sections';

export async function generateMetadata(): Promise<Metadata> {
  const [t, site] = await Promise.all([
    getTranslations('legal.privacy'),
    getTranslations('metadata'),
  ]);
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: { canonical: routes.privacy() },
    openGraph: brandOpenGraph({
      title: t('metaTitle'),
      description: t('metaDescription'),
      siteName: site('siteName'),
      imageAlt: site('ogImageAlt'),
    }),
  };
}

/** The privacy policy (M10): the catalog's `legal.privacy`. */
export default function PrivacyPage() {
  return (
    <PageTransition>
      <LegalDocument document="privacy" sections={privacySections} />
    </PageTransition>
  );
}
