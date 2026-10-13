import { useId } from 'react';

import Link from 'next/link';

import ChevronRight from '@material-symbols/svg-400/rounded/chevron_right.svg?svgr';
import IdCard from '@material-symbols/svg-400/rounded/id_card.svg?svgr';
import Monitoring from '@material-symbols/svg-400/rounded/monitoring.svg?svgr';
import Stethoscope from '@material-symbols/svg-400/rounded/stethoscope.svg?svgr';
import { useTranslations } from 'next-intl';

import { routes } from '@/app/lib/routes';
import { cn } from '@/app/lib/utils';

import { Icon, type IconComponent } from '@/app/ui/icons';

const cardClass =
  'group flex min-h-20 items-center gap-4 rounded-2xl bg-pure-white p-4 shadow-md transition-[translate,box-shadow] duration-base ease-house outline-none hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-3 focus-visible:ring-ring/50';

function LinkCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: IconComponent;
  title: string;
  description: string;
}) {
  return (
    // As a UrlObject: the paths come from routes.ts.
    <Link href={{ pathname: href }} className={cardClass}>
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-info-light text-primary transition-[scale] duration-base ease-house group-hover:scale-110">
        <Icon icon={icon} size={24} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-title-md text-text-primary">{title}</span>
        <span className="text-body-sm text-text-secondary">{description}</span>
      </span>
      <Icon
        icon={ChevronRight}
        size={24}
        className="shrink-0 text-grey-400 transition-[translate] duration-base ease-house group-hover:translate-x-0.5"
      />
    </Link>
  );
}

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
 * What only the app does, said plainly: booking patients and editing the
 * specialties, the profile, the offices and the hours. Each card leads to
 * its page under `/panel/`, which opens the app on a phone where it is
 * installed.
 */
export function PanelInApp({ className }: { className?: string }) {
  const t = useTranslations('panel.home.inApp');
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
            href={routes.specialtiesBridge()}
            icon={Stethoscope}
            title={t('specialties.title')}
            description={t('specialties.description')}
          />
        </li>
        <li>
          <LinkCard
            href={routes.profileBridge()}
            icon={IdCard}
            title={t('profile.title')}
            description={t('profile.description')}
          />
        </li>
      </ul>
    </section>
  );
}
