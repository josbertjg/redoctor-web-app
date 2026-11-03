'use client';

import { useTranslations } from 'next-intl';

import { useSession } from '@/app/hooks/use-session';

/*
 * «Hola,» and the specialist's name, as the designer's home greets them on
 * the blue; the page's title. Room is kept at its right, from laptops up,
 * for the profile's state, the bell and the account.
 */
export function PanelGreeting() {
  const t = useTranslations('panel.home');
  const { account, user } = useSession();
  const name = account?.name ?? user?.name ?? null;

  return (
    <h1 className="flex flex-col lg:pr-72">
      <span className="text-subtitle-l font-medium text-blue-200 lg:text-title-xxl">
        {name ? t('hello') : t('greetingNoName')}
      </span>{' '}
      {name ? (
        <span className="text-title-xl font-semibold break-words text-pure-white lg:text-title-xxxl">
          {name}
        </span>
      ) : null}
    </h1>
  );
}
