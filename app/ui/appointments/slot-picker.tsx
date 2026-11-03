'use client';

import { useEffect, useRef } from 'react';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import type { TokenHolder } from '@/app/lib/api/types';
import {
  availableDaysQueryOptions,
  daySlotsQueryOptions,
} from '@/app/lib/queries/appointments';
import { freeDays } from '@/app/lib/schemas/availability';

import { useReducedMotion } from '@/app/ui/motion';
import { Skeleton } from '@/app/ui/skeleton';

import { LoadFailure } from './load-failure';
import { MonthCalendar } from './month-calendar';
import { SlotChoices } from './slot-choices';

type SlotPickerProps = {
  user: TokenHolder;
  officeId: string;
  /** Today in Caracas (YYYY-MM-DD). */
  today: string;
  /** The month on screen (YYYY-MM). */
  month: string;
  onMonthChange: (month: string) => void;
  day: string | null;
  /** Another day than the chosen one: the chosen day again keeps its hour, as in the app. */
  onDayChange: (day: string) => void;
  time: string | null;
  onTimeChange: (startTime: string) => void;
  /** Reads only while it is on screen (a sheet that is open). */
  enabled?: boolean;
};

/*
 * A slot at an office, as the app's calendar chooses one: a month with the
 * days that have free slots, then the chosen day's free hours by morning,
 * afternoon and evening. Only the free hours are listed. The reschedule
 * sheet (M5) and the booking (M15) choose with it; what they do with the
 * slot is theirs. A chosen day is judged by its own month, not by the one
 * on screen: browsing to the next month never hides the choice.
 */
export function SlotPicker({
  user,
  officeId,
  today,
  month,
  onMonthChange,
  day,
  onDayChange,
  time,
  onTimeChange,
  enabled = true,
}: SlotPickerProps) {
  const t = useTranslations();
  const hours = useRef<HTMLElement>(null);
  const tapped = useRef(false);
  const reducedMotion = useReducedMotion();
  const ready = enabled && officeId !== '';

  // The month fills a phone's screen: a day the person taps brings its
  // hours into view, or they would appear below the fold, unseen. A day
  // the page suggests (the booking's first free one) moves nothing.
  useEffect(() => {
    if (day === null || !tapped.current) return;
    tapped.current = false;
    hours.current?.scrollIntoView({
      block: 'nearest',
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  }, [day, reducedMotion]);

  const days = useQuery({
    ...availableDaysQueryOptions(user, officeId, month),
    enabled: ready,
  });
  const free = days.data ? freeDays(days.data.days) : new Set<string>();
  const ofChosenMonth = useQuery({
    ...availableDaysQueryOptions(user, officeId, day?.slice(0, 7) ?? month),
    enabled: ready && day !== null,
  });
  const dayIsFree =
    day !== null &&
    day >= today &&
    ofChosenMonth.data !== undefined &&
    freeDays(ofChosenMonth.data.days).has(day);
  const slots = useQuery({
    ...daySlotsQueryOptions(user, officeId, day ?? ''),
    enabled: ready && dayIsFree,
  });
  const freeSlots = (slots.data?.slots ?? []).filter((slot) => slot.available);

  return (
    <>
      <section className="flex flex-col gap-2">
        <h3 className="text-title-sm text-text-primary">{t('pickADate')}</h3>
        <MonthCalendar
          month={month}
          today={today}
          freeDays={free}
          loading={days.isPending && ready}
          selected={day}
          onMonthChange={onMonthChange}
          onSelect={(date) => {
            if (date === day) return;
            tapped.current = true;
            onDayChange(date);
          }}
        />
        {days.isError ? (
          <LoadFailure
            message={t('appointments.detail.daysLoadError')}
            retrying={days.isFetching}
            onRetry={() => {
              void days.refetch();
            }}
          />
        ) : null}
      </section>

      {day !== null ? (
        <section ref={hours} className="flex animate-fade-up flex-col gap-3">
          <h3 className="text-title-sm text-text-primary">
            {t('appointments.detail.selectASlot')}
          </h3>
          {slots.isError || ofChosenMonth.isError ? (
            <LoadFailure
              message={t('appointments.detail.slotsLoadError')}
              retrying={slots.isFetching || ofChosenMonth.isFetching}
              onRetry={() => {
                void (ofChosenMonth.isError
                  ? ofChosenMonth.refetch()
                  : slots.refetch());
              }}
            />
          ) : ofChosenMonth.isPending || (dayIsFree && slots.isPending) ? (
            <div aria-busy="true" className="grid grid-cols-3 gap-2">
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={index} className="h-control w-full" />
              ))}
            </div>
          ) : !dayIsFree || freeSlots.length === 0 ? (
            <p className="text-body-md text-text-secondary">
              {t('no_slots_available')}
            </p>
          ) : (
            <SlotChoices
              slots={freeSlots}
              selected={time}
              onSelect={onTimeChange}
            />
          )}
        </section>
      ) : null}
    </>
  );
}
