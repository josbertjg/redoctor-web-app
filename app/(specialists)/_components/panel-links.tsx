import { useId } from 'react';

import IdCard from '@material-symbols/svg-400/rounded/id_card.svg?svgr';
import Monitoring from '@material-symbols/svg-400/rounded/monitoring.svg?svgr';
import Stethoscope from '@material-symbols/svg-400/rounded/stethoscope.svg?svgr';
import { useTranslations } from 'next-intl';

import { routes } from '@/app/lib/routes';
import { cn } from '@/app/lib/utils';

import { LinkCard } from '@/app/ui/link-card';

/** The statistics, one card away from the home (the app's «Estadísticas» tab). */
export function PanelStatisticsCard({ className }: { className?: string }) {
  const t = useTranslations('panel.home.statistics');
  return (
    <div className={className}>
      <LinkCard
        href={routes.reports()}
        icon={Monitoring}
        title={t('title')}
        description={t('description')}
      />
    </div>
  );
}

/*
 * The specialist's profile, one card away from the home: what patients see
 * («Mi perfil») and each specialty's review («Mis especialidades»), with
 * what stays in the app said plainly — booking, and editing the profile,
 * the offices and the hours. On a phone with the app, both pages open it.
 */
export function PanelProfileLinks({ className }: { className?: string }) {
  const t = useTranslations('panel.home.profile');
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className={cn('flex flex-col gap-3', className)}
    >
      <div className="flex flex-col gap-1">
        <h2 id={headingId} className="text-title-lg text-text-primary">
          {t('title')}
        </h2>
        <p className="text-body-md text-text-secondary">{t('description')}</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        <li>
          <LinkCard
            href={routes.specialistProfile()}
            icon={IdCard}
            title={t('myProfile.title')}
            description={t('myProfile.description')}
          />
        </li>
        <li>
          <LinkCard
            href={routes.specialties()}
            icon={Stethoscope}
            title={t('specialties.title')}
            description={t('specialties.description')}
          />
        </li>
      </ul>
    </section>
  );
}
