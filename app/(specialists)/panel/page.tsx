import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';

import { AdminNote } from '../_components/admin-note';
import { SpecialistOptions } from '../_components/specialist-options';

/*
 * `/panel` (M2, owner's decision of 2026-10-12): where a specialist
 * lands after signing in on the web. Their tools live in the app, so the
 * page lists them and each one opens the app through its bridge (M11).
 * The payment (M13) will join them here. Never indexed.
 */

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('specialistHome');
  return { title: t('metaTitle'), robots: { index: false, follow: false } };
}

export default async function SpecialistHomePage() {
  const t = await getTranslations('specialistHome');

  return (
    <main className="mx-auto w-full max-w-content flex-1 px-gutter pt-4 pb-16">
      <h1 className="text-headline-md text-text-primary">{t('title')}</h1>
      <p className="mt-2 text-body-md text-text-secondary">
        {t('description')}
      </p>
      <AdminNote className="mt-4" />
      <SpecialistOptions className="mt-6" />
    </main>
  );
}
