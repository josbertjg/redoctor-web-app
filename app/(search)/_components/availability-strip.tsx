'use client';

import Link from 'next/link';

import { useTranslations } from 'next-intl';

import {
  formatAppointmentDay,
  formatDayMonthShort,
  formatWeekdayShort,
} from '@/app/lib/format/appointment-time';
import { routes } from '@/app/lib/routes';
import type { SearchResultDay } from '@/app/lib/schemas/search';
import { cn } from '@/app/lib/utils';

import { fadingEdgesClass } from '@/app/ui/fading-edges';

import { useFadingEdges } from '@/app/hooks/use-fading-edges';

/** The app's strip shows the twelve; the card shows a handful and the way to the rest. */
const shownDays = 5;

type AvailabilityStripProps = {
  specialistId: string;
  specialistName: string;
  officeId: string;
  days: readonly SearchResultDay[];
};

/*
 * The nearest office's next days, as the app's strip under each result:
 * a free day opens the booking on it (M15, `?date=`), a full one says so,
 * and «Más fechas» opens the booking's calendar. Nothing in the next days:
 * the strip says that instead.
 */
export function AvailabilityStrip({
  specialistId,
  specialistName,
  officeId,
  days,
}: AvailabilityStripProps) {
  const t = useTranslations();
  const shown = days.slice(0, shownDays);
  const { ref: row, fade } = useFadingEdges<HTMLDivElement>(shown.length > 0);

  if (shown.length === 0) {
    return (
      <p className="text-body-sm text-text-secondary">
        {t('search.web.noNextDays')}
      </p>
    );
  }

  const cell =
    'flex min-h-touch min-w-18 shrink-0 snap-start flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1.5 text-center';

  return (
    <div
      ref={row}
      role="group"
      aria-label={t('search.web.nextDays')}
      data-fade={fade}
      // Above the card's own link (result-card.tsx): the days keep their taps.
      className={cn(
        'relative z-10 -mx-4 flex snap-x scrollbar-none gap-2 overflow-x-auto px-4',
        fadingEdgesClass,
      )}
    >
      {shown.map((day) => {
        // One ink per pill, whole: its words read on its tint at 11 px (AA).
        const words = (
          <>
            <span className="text-label-sm capitalize">
              {formatWeekdayShort(day.date)}
            </span>
            <span className="text-label-lg">
              {formatDayMonthShort(day.date)}
            </span>
          </>
        );
        return day.available ? (
          <Link
            key={day.date}
            href={routes.book(specialistId, officeId, day.date)}
            rel="nofollow"
            aria-label={t('search.web.bookOn', {
              name: specialistName,
              date: formatAppointmentDay(day.date),
            })}
            className={cn(
              cell,
              'bg-success-light text-green-800 transition-[translate,background-color,box-shadow] duration-fast ease-house outline-none hover:-translate-y-0.5 hover:bg-green-100 hover:shadow-sm focus-visible:ring-3 focus-visible:ring-ring/50',
            )}
          >
            {words}
            <span className="text-label-sm">{t('available')}</span>
          </Link>
        ) : (
          <span
            key={day.date}
            aria-label={t('search.web.fullOn', {
              date: formatAppointmentDay(day.date),
            })}
            className={cn(cell, 'bg-surface-variant text-grey-700')}
          >
            {words}
            <span className="text-label-sm">{t('notAvailable')}</span>
          </span>
        );
      })}
      <Link
        href={routes.book(specialistId, officeId)}
        rel="nofollow"
        className={cn(
          cell,
          'border border-divider text-label-lg text-primary transition-[background-color,border-color] duration-fast ease-house outline-none hover:border-primary hover:bg-info-light focus-visible:ring-3 focus-visible:ring-ring/50',
        )}
      >
        {t('search.web.moreDates')}
      </Link>
    </div>
  );
}
