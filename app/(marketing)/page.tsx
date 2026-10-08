import { useTranslations } from 'next-intl';

import { Logo } from '@/app/ui/logo';

/*
 * Provisional cover for the pilot, with the landing doc's hero copy. The
 * landing (M9) replaces it once the design and the open decisions are closed.
 */
export default function HomePage() {
  const t = useTranslations();

  return (
    <main className="mx-auto flex w-full max-w-content flex-1 animate-fade-up flex-col items-center justify-center gap-6 px-gutter py-16 text-center">
      <Logo label={t('metadata.siteName')} preload className="h-10" />
      <h1 className="text-headline-md text-primary sm:text-headline-lg">
        {t('landing.provisional.title')}
      </h1>
      <p className="text-body-lg text-text-secondary">
        {t('landing.provisional.description')}
      </p>
      <p className="text-label-lg text-text-primary">
        {t('landing.provisional.linkHint')}
      </p>
    </main>
  );
}
