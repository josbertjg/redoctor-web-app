import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';

import { routes } from '@/app/lib/routes';
import { brandOpenGraph } from '@/app/lib/site';

import { PageTransition } from '@/app/ui/motion/view-transitions';

import { LegalDocument } from '../_components/legal-document';
import { termsSections } from '../_data/legal-sections';

export async function generateMetadata(): Promise<Metadata> {
  const [t, site] = await Promise.all([
    getTranslations('legal.terms'),
    getTranslations('metadata'),
  ]);
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: { canonical: routes.terms() },
    openGraph: brandOpenGraph({
      title: t('metaTitle'),
      description: t('metaDescription'),
      siteName: site('siteName'),
      imageAlt: site('ogImageAlt'),
    }),
  };
}

/** The terms and conditions of use (M10): the catalog's `legal.terms`. */
export default function TermsPage() {
  return (
    <PageTransition>
      <LegalDocument document="terms" sections={termsSections} />
    </PageTransition>
  );
}
