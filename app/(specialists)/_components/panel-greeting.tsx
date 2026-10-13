'use client';

import { useTranslations } from 'next-intl';

import { useSession } from '@/app/hooks/use-session';

/** «Hola, {name}», as the app's home greets the specialist; the page's title. */
export function PanelGreeting() {
  const t = useTranslations('panel.home');
  const { account, user } = useSession();
  const name = account?.name ?? user?.name ?? null;

  return (
    <h1 className="text-headline-md break-words text-text-primary">
      {name ? t('greeting', { name }) : t('greetingNoName')}
    </h1>
  );
}
