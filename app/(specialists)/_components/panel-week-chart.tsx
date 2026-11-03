'use client';

import { useId } from 'react';

import { useTranslations } from 'next-intl';

import {
  formatAppointmentDay,
  formatWeekdayShort,
} from '@/app/lib/format/appointment-time';
import type { AppointmentSummary } from '@/app/lib/schemas/appointments';
import { cn } from '@/app/lib/utils';

type PanelWeekChartProps = {
  /** The week's seven days, Monday first. */
  days: readonly string[];
  today: string;
  appointments: readonly AppointmentSummary[];
};

/*
 * «Esta semana» (the designer's frame left its metric to us): how many
 * appointments each day of the week holds, the cancelled ones aside, today
 * in green. Drawn with boxes, as the statistics; its numbers are a table
 * for screen readers, which skip the drawing.
 */
export function PanelWeekChart({
  days,
  today,
  appointments,
}: PanelWeekChartProps) {
  const t = useTranslations('panel.home.week');
  const headingId = useId();
  const captionId = useId();
  const counts = days.map(
    (day) =>
      appointments.filter(
        (appointment) =>
          appointment.date === day && appointment.status !== 'CANCELLED',
      ).length,
  );
  const total = counts.reduce((sum, count) => sum + count, 0);
  const tallest = Math.max(1, ...counts);

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <h2
        id={headingId}
        className="text-subtitle-m font-semibold text-pure-white lg:pt-5"
      >
        {t('title')}
      </h2>
      <figure
        aria-labelledby={captionId}
        className="flex flex-1 flex-col gap-4 rounded-xl bg-pure-white px-6 py-6 shadow-md sm:px-7"
      >
        <div className="flex flex-col">
          <p className="text-body-lg font-semibold text-text-primary">
            {t('chartTitle')}
          </p>
          <p className="text-label-lg text-grey-500">
            {t('total', { count: total })}
          </p>
        </div>
        <div
          aria-hidden="true"
          className="flex h-36 items-end justify-between gap-2 sm:gap-4"
        >
          {days.map((day, index) => {
            const count = counts[index] ?? 0;
            return (
              <div
                key={day}
                className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2.5"
              >
                <div
                  className={cn(
                    'w-full max-w-7.5 rounded-md transition-[height] duration-slow ease-house',
                    day === today ? 'bg-green-500' : 'bg-primary',
                    count === 0 && 'bg-white-300',
                  )}
                  style={{
                    height:
                      count === 0
                        ? '0.25rem'
                        : `${String((count / tallest) * 100)}%`,
                  }}
                />
                <span className="text-label-md text-text-primary capitalize">
                  {formatWeekdayShort(day)}
                </span>
              </div>
            );
          })}
        </div>
        <figcaption id={captionId} className="sr-only">
          {t('caption')}
        </figcaption>
        {/* A table never shrinks to 1 px: the box around it hides it whole. */}
        <div className="sr-only">
          <table>
            <thead>
              <tr>
                <th scope="col">{t('dayHeader')}</th>
                <th scope="col">{t('countHeader')}</th>
              </tr>
            </thead>
            <tbody>
              {days.map((day, index) => (
                <tr key={day}>
                  <th scope="row">{formatAppointmentDay(day)}</th>
                  <td>{counts[index] ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </figure>
    </section>
  );
}
