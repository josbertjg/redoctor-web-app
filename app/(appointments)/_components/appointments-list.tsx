'use client';

import CalendarMonth from '@material-symbols/svg-400/rounded/calendar_month.svg?svgr';
import History from '@material-symbols/svg-400/rounded/history.svg?svgr';
import { useTranslations } from 'next-intl';

import type {
  AppointmentGroups,
  AppointmentSummary,
} from '@/app/lib/schemas/appointments';

import { EmptyState } from '@/app/ui/empty-state';
import { type IconComponent } from '@/app/ui/icons';
import { Tabs } from '@/app/ui/tabs';

import { AppointmentCard } from './appointment-card';

/*
 * «Mis citas» (M6): the ones to come and the ones over, each in its tab
 * with its count. A patient with nothing ahead lands on «Pasadas»; one with
 * nothing at all is told how appointments reach them in the pilot — through
 * the specialist's link, since the web does not book yet.
 */
export function AppointmentsList({ groups }: { groups: AppointmentGroups }) {
  const t = useTranslations('appointments.list');

  if (groups.upcoming.length === 0 && groups.past.length === 0) {
    return (
      <>
        <h1 className="text-headline-sm text-text-primary">{t('title')}</h1>
        <EmptyState
          icon={CalendarMonth}
          title={t('empty')}
          description={t('emptyDescription')}
        />
      </>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <h1 className="text-headline-sm text-text-primary">{t('title')}</h1>
      <Tabs
        label={t('tabsLabel')}
        defaultValue={groups.upcoming.length === 0 ? 'past' : 'upcoming'}
        items={[
          {
            value: 'upcoming',
            label: t('withCount', {
              label: t('upcoming'),
              count: groups.upcoming.length,
            }),
            content: (
              <AppointmentsSection
                appointments={groups.upcoming}
                icon={CalendarMonth}
                emptyTitle={t('noUpcoming')}
                emptyDescription={t('noUpcomingDescription')}
              />
            ),
          },
          {
            value: 'past',
            label: t('withCount', {
              label: t('past'),
              count: groups.past.length,
            }),
            content: (
              <AppointmentsSection
                appointments={groups.past}
                icon={History}
                emptyTitle={t('noPast')}
                emptyDescription={t('noPastDescription')}
              />
            ),
          },
        ]}
      />
    </div>
  );
}

function AppointmentsSection({
  appointments,
  icon,
  emptyTitle,
  emptyDescription,
}: {
  appointments: readonly AppointmentSummary[];
  icon: IconComponent;
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (appointments.length === 0) {
    return (
      <EmptyState
        headingLevel={2}
        className="py-6"
        icon={icon}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {appointments.map((appointment) => (
        <AppointmentCard key={appointment.id} appointment={appointment} />
      ))}
    </ul>
  );
}
