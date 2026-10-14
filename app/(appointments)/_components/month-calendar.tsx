'use client';

import { useRef } from 'react';

import ChevronLeft from '@material-symbols/svg-400/rounded/chevron_left.svg?svgr';
import ChevronRight from '@material-symbols/svg-400/rounded/chevron_right.svg?svgr';
import { useTranslations } from 'next-intl';

import {
  formatAppointmentDay,
  formatMonth,
  weekdayInitials,
} from '@/app/lib/format/appointment-time';
import { cn } from '@/app/lib/utils';

import { Icon } from '@/app/ui/icons';
import { Skeleton } from '@/app/ui/skeleton';

type MonthCalendarProps = {
  /** YYYY-MM. */
  month: string;
  /** Today in Caracas (YYYY-MM-DD): no earlier month is offered. */
  today: string;
  /** The days with free slots. */
  freeDays: ReadonlySet<string>;
  loading: boolean;
  selected: string | null;
  onMonthChange: (month: string) => void;
  onSelect: (date: string) => void;
};

const pad = (value: number) => String(value).padStart(2, '0');

/** The month `by` months after (or before) a YYYY-MM. */
export function shiftMonth(month: string, by: number): string {
  const [year = 0, number = 1] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, number - 1 + by, 1));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
}

/** The month's days in weeks from Monday, with blanks before the first. */
function monthCells(month: string): (string | null)[] {
  const [year = 0, number = 1] = month.split('-').map(Number);
  const lead = (new Date(Date.UTC(year, number - 1, 1)).getUTCDay() + 6) % 7;
  const length = new Date(Date.UTC(year, number, 0)).getUTCDate();
  return [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length }, (_, index) => `${month}-${pad(index + 1)}`),
  ];
}

/*
 * A month to choose a day from, as the app's reschedule calendar: the days
 * with free slots in the brand's blue, the others grey. Every day answers
 * a tap (nothing disabled, AGENTS.md §8.3); a day without slots says so
 * below. No month before today's.
 */
export function MonthCalendar({
  month,
  today,
  freeDays,
  loading,
  selected,
  onMonthChange,
  onSelect,
}: MonthCalendarProps) {
  const t = useTranslations('appointments.detail');
  const cells = monthCells(month);
  const canGoBack = month > today.slice(0, 7);
  const next = useRef<HTMLButtonElement>(null);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p
          aria-live="polite"
          className="text-title-sm text-text-primary first-letter:uppercase"
        >
          {formatMonth(month)}
        </p>
        <div className="flex gap-1">
          {canGoBack ? (
            <button
              type="button"
              aria-label={t('previousMonth')}
              onClick={() => {
                const previous = shiftMonth(month, -1);
                onMonthChange(previous);
                // Back on today's month this button goes: the focus stays
                // on the calendar's other arrow instead of the page's start.
                if (previous <= today.slice(0, 7)) next.current?.focus();
              }}
              className="flex size-touch items-center justify-center rounded-full text-primary outline-none hover:bg-white-200 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Icon icon={ChevronLeft} size={24} />
            </button>
          ) : null}
          <button
            ref={next}
            type="button"
            aria-label={t('nextMonth')}
            onClick={() => {
              onMonthChange(shiftMonth(month, 1));
            }}
            className="flex size-touch items-center justify-center rounded-full text-primary outline-none hover:bg-white-200 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Icon icon={ChevronRight} size={24} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {weekdayInitials().map((initial, index) => (
          <span
            // Two weekdays share an initial (M): the column tells them apart.
            key={index}
            aria-hidden="true"
            className="text-label-md text-text-secondary"
          >
            {initial}
          </span>
        ))}
        {cells.map((date, index) =>
          date === null ? (
            <span key={`blank-${index}`} />
          ) : loading ? (
            <Skeleton
              key={date}
              className="mx-auto h-touch w-full max-w-touch rounded-full"
            />
          ) : (
            <button
              key={date}
              type="button"
              aria-label={
                freeDays.has(date) && date >= today
                  ? formatAppointmentDay(date)
                  : t('dayWithoutSlots', { day: formatAppointmentDay(date) })
              }
              aria-pressed={selected === date}
              onClick={() => {
                onSelect(date);
              }}
              className={cn(
                // A full tap target; on the narrowest phones the column
                // trims its width, never its height.
                'mx-auto flex h-touch w-full max-w-touch items-center justify-center rounded-full text-body-md transition-colors duration-fast ease-house outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                selected === date
                  ? 'bg-primary text-on-primary'
                  : freeDays.has(date) && date >= today
                    ? 'font-semibold text-primary hover:bg-blue-50'
                    : // Grey, but still AA: a day without slots is read, then tapped.
                      'text-text-secondary hover:bg-white-200',
              )}
            >
              {Number(date.slice(8))}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
