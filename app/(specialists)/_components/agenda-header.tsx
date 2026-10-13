import Link from 'next/link';

import { useTranslations } from 'next-intl';

import { routes } from '@/app/lib/routes';
import { cn } from '@/app/lib/utils';

const tabClass =
  'flex min-h-touch flex-1 items-center justify-center border-b-2 px-4 text-body-xs outline-none transition-colors duration-fast ease-house focus-visible:ring-3 focus-visible:ring-ring/50';

/*
 * The head of the panel's «Citas» (M14), as the app's tab: the title, then
 * the day's agenda and the history, each a page of its own (a day has its
 * address: the daily summary's «Ver mi agenda» opens it). Links with the
 * look of the app's tabs, the one on screen marked for every reader.
 */
export function AgendaHeader({ active }: { active: 'day' | 'history' }) {
  const t = useTranslations();

  const tab = (key: 'day' | 'history', href: string) => (
    // As a UrlObject: the tabs' paths are strings from routes.ts.
    <Link
      href={{ pathname: href }}
      aria-current={active === key ? 'page' : undefined}
      className={cn(
        tabClass,
        active === key
          ? 'border-primary font-semibold text-primary'
          : 'border-transparent text-text-secondary hover:text-text-primary',
      )}
    >
      {t(`panel.agenda.${key}`)}
    </Link>
  );

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-headline-sm text-text-primary">
        {t('appointments.hub.title')}
      </h1>
      <nav aria-label={t('panel.agenda.tabsLabel')}>
        <div className="flex border-b border-divider">
          {tab('day', routes.agenda())}
          {tab('history', routes.specialistAppointments())}
        </div>
      </nav>
    </div>
  );
}
