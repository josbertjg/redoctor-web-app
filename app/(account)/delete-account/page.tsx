import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';

import { routes } from '@/app/lib/routes';
import { brandOpenGraph } from '@/app/lib/site';

import { LegalDocument } from '../_components/legal-document';
import { deleteAccountSections } from '../_data/legal-sections';

export async function generateMetadata(): Promise<Metadata> {
  const [t, site] = await Promise.all([
    getTranslations('legal.deleteAccount'),
    getTranslations('metadata'),
  ]);
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: { canonical: routes.deleteAccount() },
    openGraph: brandOpenGraph({
      title: t('metaTitle'),
      description: t('metaDescription'),
      siteName: site('siteName'),
      imageAlt: site('ogImageAlt'),
    }),
  };
}

/*
 * How to have one's account deleted (M10): through support until the API
 * deletes an account on request (REDOC-352); the stores ask for this page.
 */
export default function DeleteAccountPage() {
  return (
    <LegalDocument
      document="deleteAccount"
      sections={deleteAccountSections}
      contents={false}
    />
  );
}
