'use client';

import EventAvailable from '@material-symbols/svg-400/rounded/event_available.svg?svgr';
import Schedule from '@material-symbols/svg-400/rounded/schedule.svg?svgr';
import { useQueries } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import type { SessionUser } from '@/app/lib/firebase/client';
import {
  formatAppointmentTime,
  formatSlotDuration,
} from '@/app/lib/format/appointment-time';
import { officeScheduleQueryOptions } from '@/app/lib/queries/offices';
import type {
  DayOfWeek,
  Office,
  WeeklySchedule,
} from '@/app/lib/schemas/offices';

import { Icon } from '@/app/ui/icons';

import { OfficeCard, OfficeResults } from './office-results';
import { ProfileBlock, ProfileBlockEmpty } from './profile-block';

/*
 * «Horarios», as the app's profile: per office with hours, the days that
 * share them («Lun a Jue») with their ranges, and how long each
 * appointment lasts.
 */
export function ProfileSchedules({
  user,
  offices,
}: {
  user: SessionUser;
  offices: readonly Office[];
}) {
  const t = useTranslations();
  const results = useQueries({
    queries: offices.map((office) =>
      officeScheduleQueryOptions(user, office.id),
    ),
  });

  return (
    <ProfileBlock title={t('specialistProfile.schedule')}>
      <OfficeResults
        offices={offices}
        results={results}
        shows={(schedule) => schedule.groups.length > 0}
        errorMessage={(office) =>
          t('profile.officeScheduleError', { office: office.name })
        }
        empty={
          <ProfileBlockEmpty icon={EventAvailable}>
            {t('specialistProfile.addSchedule')}
          </ProfileBlockEmpty>
        }
      >
        {(office, schedule) => (
          <OfficeWeek name={office.name} schedule={schedule} />
        )}
      </OfficeResults>
    </ProfileBlock>
  );
}

function OfficeWeek({
  name,
  schedule,
}: {
  name: string;
  schedule: WeeklySchedule;
}) {
  const t = useTranslations();
  const day = (value: DayOfWeek) => t(`days.${value}_SHORT`);
  const days = (values: readonly DayOfWeek[]) => {
    const first = values[0];
    const last = values[values.length - 1];
    if (first === undefined || last === undefined) return '';
    return first === last
      ? day(first)
      : `${day(first)} ${t('specialistProfile.scheduleRangeConnector')} ${day(last)}`;
  };

  return (
    <OfficeCard
      name={name}
      badge={
        schedule.slotMinutes ? (
          <span className="inline-flex shrink-0 items-center rounded-full border border-primary px-2.5 py-0.5 text-label-md text-primary">
            {formatSlotDuration(schedule.slotMinutes, {
              hour: t('specialistProfile.hour'),
              hours: t('specialistProfile.hours'),
              minutes: t('specialistProfile.minuteShort'),
              perAppointment: t('specialistProfile.perAppointment'),
            })}
          </span>
        ) : null
      }
    >
      <dl className="flex flex-col gap-2.5">
        {schedule.groups.map((group) => (
          <div
            key={group.days.join('-')}
            className="flex flex-col gap-0.5 sm:flex-row sm:gap-3"
          >
            <dt className="text-body-md font-semibold text-text-primary sm:w-24 sm:shrink-0">
              {days(group.days)}
            </dt>
            <dd className="flex min-w-0 items-start gap-1.5 text-body-md text-text-secondary">
              <Icon icon={Schedule} size={16} className="mt-0.5 shrink-0" />
              {/* One range a line: a range never breaks in two. */}
              <span className="flex flex-col">
                {group.ranges.map((range) => (
                  <span
                    key={`${range.start}-${range.end}`}
                    className="whitespace-nowrap"
                  >
                    {formatAppointmentTime(range.start)} –{' '}
                    {formatAppointmentTime(range.end)}
                  </span>
                ))}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </OfficeCard>
  );
}
