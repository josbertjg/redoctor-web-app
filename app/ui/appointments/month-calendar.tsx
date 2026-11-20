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
  /**
   * `slots` (the reschedule's and the booking's): the days with free slots
   * in blue, no month before today's. `agenda` (the specialist's): every
   * day alike, today in blue, a dot under the days with appointments, and
   * the months before too. `booking` (the public profile's, Figma
   * 2026-11-16): `slots` drawn as the profile's panel — the month between
   * its arrows, the days with hours in black, the others grey on a grey
   * circle, the chosen one in the brand's green, the last days of the month
   * before faint.
   */
  variant?: 'slots' | 'agenda' | 'booking';
  /** YYYY-MM. */
  month: string;
  /** Today in Caracas (YYYY-MM-DD). */
  today: string;
  /** The days with free slots; on the agenda, the days with appointments. */
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

/** The day of the month before that a blank at `index` stands for. */
function leadingDay(month: string, index: number, lead: number): number {
  const [year = 0, number = 1] = month.split('-').map(Number);
  const previousLength = new Date(Date.UTC(year, number - 1, 0)).getUTCDate();
  return previousLength - lead + index + 1;
}

/*
 * A month to choose a day from, as the app's reschedule calendar: the days
 * with free slots in the brand's blue, the others grey. Every day answers
 * a tap (nothing disabled, AGENTS.md §8.3); a day without slots says so
 * below. No month before today's.
 */
export function MonthCalendar({
  variant = 'slots',
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
  const lead = cells.findIndex((cell) => cell !== null);
  const agenda = variant === 'agenda';
  const booking = variant === 'booking';
  const canGoBack = agenda || month > today.slice(0, 7);
  const next = useRef<HTMLButtonElement>(null);

  const arrow =
    'flex size-touch items-center justify-center rounded-full outline-none hover:bg-white-200 focus-visible:ring-3 focus-visible:ring-ring/50';
  const previousButton = canGoBack ? (
    <button
      type="button"
      aria-label={t('previousMonth')}
      onClick={() => {
        const previous = shiftMonth(month, -1);
        onMonthChange(previous);
        // Back on today's month this button goes: the focus stays
        // on the calendar's other arrow instead of the page's start.
        if (!agenda && previous <= today.slice(0, 7)) {
          next.current?.focus();
        }
      }}
      className={cn(arrow, booking ? 'text-grey-900' : 'text-primary')}
    >
      <Icon icon={ChevronLeft} size={24} />
    </button>
  ) : booking ? (
    // Its place kept: the month stays centred between the arrows.
    <span aria-hidden="true" className="size-touch" />
  ) : null;
  const nextButton = (
    <button
      ref={next}
      type="button"
      aria-label={t('nextMonth')}
      onClick={() => {
        onMonthChange(shiftMonth(month, 1));
      }}
      className={cn(arrow, booking ? 'text-grey-900' : 'text-primary')}
    >
      <Icon icon={ChevronRight} size={24} />
    </button>
  );
  const title = (
    <p
      aria-live="polite"
      className={cn(
        'text-text-primary first-letter:uppercase',
        booking ? 'text-body-xs font-semibold' : 'text-title-sm',
      )}
    >
      {formatMonth(month)}
    </p>
  );

  return (
    <div className={cn('flex flex-col', booking ? 'gap-3' : 'gap-2')}>
      <div className="flex items-center justify-between">
        {booking ? (
          <>
            {previousButton}
            {title}
            {nextButton}
          </>
        ) : (
          <>
            {title}
            <div className="flex gap-1">
              {previousButton}
              {nextButton}
            </div>
          </>
        )}
      </div>
      <div
        className={cn(
          'grid grid-cols-7 text-center',
          booking ? 'gap-x-1 gap-y-3' : 'gap-1',
        )}
      >
        {weekdayInitials().map((initial, index) => (
          <span
            // Two weekdays share an initial (M): the column tells them apart.
            key={index}
            aria-hidden="true"
            className={
              booking
                ? 'text-body-xs font-semibold text-grey-800'
                : 'text-label-md text-text-secondary'
            }
          >
            {initial}
          </span>
        ))}
        {cells.map((date, index) =>
          date === null ? (
            booking ? (
              // The month before's last days, faint: no choice there.
              <span
                key={`blank-${index}`}
                aria-hidden="true"
                // Pure decoration (WCAG 1.4.3 asks it no contrast): the e2e
                // audit knows it by this mark.
                data-decoration=""
                className="mx-auto flex size-10 items-center justify-center text-body-xs font-semibold text-grey-300 touch:size-11"
              >
                {leadingDay(month, index, lead)}
              </span>
            ) : (
              <span key={`blank-${index}`} />
            )
          ) : loading ? (
            <Skeleton
              key={date}
              className={cn(
                'mx-auto rounded-full',
                booking
                  ? 'size-10 touch:size-11'
                  : 'h-touch w-full max-w-touch',
              )}
            />
          ) : (
            <button
              key={date}
              type="button"
              aria-label={
                agenda
                  ? freeDays.has(date)
                    ? t('dayWithAppointments', {
                        day: formatAppointmentDay(date),
                      })
                    : formatAppointmentDay(date)
                  : freeDays.has(date) && date >= today
                    ? formatAppointmentDay(date)
                    : t('dayWithoutSlots', { day: formatAppointmentDay(date) })
              }
              aria-pressed={selected === date}
              onClick={() => {
                onSelect(date);
              }}
              className={cn(
                'mx-auto flex items-center justify-center rounded-full transition-colors duration-fast ease-house outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                booking
                  ? cn(
                      // 40 px with a mouse, a full tap target on touch screens.
                      'size-10 text-body-xs font-semibold touch:size-11',
                      selected === date
                        ? 'bg-secondary text-pure-white'
                        : freeDays.has(date) && date >= today
                          ? 'text-pure-black hover:bg-green-50'
                          : // Figma's grey-500 reads 2.6:1 on the circle: grey-700 keeps AA.
                            'bg-grey-100 text-grey-700',
                    )
                  : // A full tap target; on the narrowest phones the column
                    // trims its width, never its height.
                    cn(
                      'h-touch w-full max-w-touch text-body-md',
                      agenda
                        ? cn(
                            'relative',
                            selected === date
                              ? 'bg-primary text-on-primary'
                              : date === today
                                ? 'font-semibold text-primary hover:bg-blue-50'
                                : 'text-text-primary hover:bg-blue-50',
                          )
                        : selected === date
                          ? 'bg-primary text-on-primary'
                          : freeDays.has(date) && date >= today
                            ? 'font-semibold text-primary hover:bg-blue-50'
                            : // Grey, but still AA: a day without slots is read, then tapped.
                              'text-text-secondary hover:bg-white-200',
                    ),
              )}
            >
              {Number(date.slice(8))}
              {agenda && freeDays.has(date) ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full',
                    selected === date ? 'bg-pure-white' : 'bg-primary',
                  )}
                />
              ) : null}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
