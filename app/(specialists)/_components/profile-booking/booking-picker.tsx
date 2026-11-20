'use client';

import { useState, type ReactNode } from 'react';

import Bedtime from '@material-symbols/svg-400/rounded/bedtime.svg?svgr';
import CalendarToday from '@material-symbols/svg-400/rounded/calendar_today.svg?svgr';
import LocationOn from '@material-symbols/svg-400/rounded/location_on.svg?svgr';
import PartlyCloudyDay from '@material-symbols/svg-400/rounded/partly_cloudy_day.svg?svgr';
import Schedule from '@material-symbols/svg-400/rounded/schedule.svg?svgr';
import Sunny from '@material-symbols/svg-400/rounded/sunny.svg?svgr';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { formatAppointmentTime } from '@/app/lib/format/appointment-time';
import {
  publicDaySlotsQueryOptions,
  specialistMonthQueryOptions,
} from '@/app/lib/queries/public-availability';
import {
  dayPartOf,
  type DayPart,
  type DaySlot,
} from '@/app/lib/schemas/availability';
import { cn } from '@/app/lib/utils';

import { LoadFailure } from '@/app/ui/appointments/load-failure';
import { MonthCalendar } from '@/app/ui/appointments/month-calendar';
import { FadingRow } from '@/app/ui/fading-row';
import { Icon, type IconComponent } from '@/app/ui/icons';
import { Skeleton } from '@/app/ui/skeleton';

import { useProfileBooking } from './profile-booking';

const dayParts: readonly { part: DayPart; icon: IconComponent }[] = [
  { part: 'morning', icon: Sunny },
  { part: 'afternoon', icon: PartlyCloudyDay },
  { part: 'evening', icon: Bedtime },
];

/*
 * The booking's choice on the public profile (Figma, 2026-11-16), in the
 * panel and in the modal alike: the office, the day, the hour — the
 * specialist's real agenda, public, before anyone signs in. The hours come
 * by morning, afternoon and evening, the booked ones shown taken.
 */
export function BookingPicker() {
  const t = useTranslations();
  const booking = useProfileBooking();
  const { specialist, today, officeId, day, month, time, agendaShown } =
    booking;

  const monthDays = useQuery({
    ...specialistMonthQueryOptions(specialist.id, month, today),
    enabled: agendaShown,
  });
  const free = new Set(monthDays.data?.[officeId] ?? []);

  return (
    <div className="flex flex-col gap-9">
      <div className="flex flex-col gap-5">
        {specialist.offices.length > 0 ? (
          <PickerSection icon={LocationOn} title={t('search.selectOffice')}>
            <OfficeChoices />
          </PickerSection>
        ) : null}
        <PickerSection icon={CalendarToday} title={t('pickADate')}>
          <MonthCalendar
            variant="booking"
            month={month}
            today={today}
            freeDays={free}
            loading={monthDays.isPending}
            selected={day}
            onMonthChange={booking.showMonth}
            onSelect={(date) => {
              if (date !== day) booking.chooseDay(date);
            }}
          />
          {monthDays.isError ? (
            <LoadFailure
              message={t('appointments.detail.daysLoadError')}
              retrying={monthDays.isFetching}
              onRetry={() => {
                void monthDays.refetch();
              }}
            />
          ) : null}
        </PickerSection>
      </div>
      <hr className="border-white-500" />
      <PickerSection icon={Schedule} title={t('search.selectASlot')}>
        {day === null ? (
          <p className="text-body-xxs text-text-secondary">
            {t('specialists.booking.pickADay')}
          </p>
        ) : (
          // A new day starts on its own part of the day.
          <HourChoices key={`${officeId}:${day}`} day={day} time={time} />
        )}
      </PickerSection>
    </div>
  );
}

function PickerSection({
  icon,
  title,
  children,
}: {
  icon: IconComponent;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2.5">
      <h3 className="flex items-center gap-2.5 text-body-xs font-semibold text-pure-black">
        <Icon icon={icon} size={16} className="text-primary" />
        {title}
      </h3>
      {children}
    </section>
  );
}

/** The offices as cards to choose one; more than fit scroll sideways. */
function OfficeChoices() {
  const t = useTranslations();
  const { specialist, officeId, chooseOffice } = useProfileBooking();
  return (
    <fieldset>
      <legend className="sr-only">{t('search.selectOffice')}</legend>
      {/* Room for the cards' shadows inside the row that scrolls. */}
      <FadingRow className="-m-1 flex snap-x scrollbar-none gap-2.5 overflow-x-auto p-1">
        {specialist.offices.map((office) => (
          <label
            key={office.id}
            className={cn(
              'group relative flex w-32 shrink-0 cursor-pointer snap-start flex-col gap-1 rounded-md bg-pure-white px-2 py-1.5 text-left shadow-md transition-colors duration-fast ease-house',
              'has-checked:bg-secondary has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
            )}
          >
            <input
              type="radio"
              name="booking-office"
              value={office.id}
              checked={office.id === officeId}
              onChange={() => {
                chooseOffice(office.id);
              }}
              className="sr-only"
            />
            <span className="line-clamp-2 min-h-[2lh] text-body-xxs font-medium text-pure-black group-has-checked:text-pure-white">
              {office.name}
            </span>
            <span className="flex min-w-0 items-center gap-1 text-body-xxs font-medium text-text-secondary group-has-checked:text-green-200">
              <Icon icon={LocationOn} size={16} className="shrink-0" />
              <span className="truncate">{office.address}</span>
            </span>
          </label>
        ))}
      </FadingRow>
    </fieldset>
  );
}

/**
 * A day's hours by morning, afternoon and evening: the part of the hour in
 * hand, or the first with a free one; the booked hours shown taken.
 */
function HourChoices({ day, time }: { day: string; time: string | null }) {
  const t = useTranslations();
  const { officeId, today, chooseTime, agendaShown } = useProfileBooking();
  const slots = useQuery({
    ...publicDaySlotsQueryOptions(officeId, day),
    enabled: agendaShown && day >= today,
  });
  const all = slots.data?.slots ?? [];
  const firstFreePart =
    dayParts.find(({ part }) =>
      all.some((slot) => slot.available && dayPartOf(slot.startTime) === part),
    )?.part ?? 'morning';
  const [chosenPart, setChosenPart] = useState<DayPart | null>(null);
  const part = chosenPart ?? (time !== null ? dayPartOf(time) : firstFreePart);
  const inPart = all.filter((slot) => dayPartOf(slot.startTime) === part);

  if (day < today || (slots.isSuccess && !all.some((slot) => slot.available))) {
    return (
      <p className="text-body-xxs text-text-secondary">
        {t('no_slots_available')}
      </p>
    );
  }
  if (slots.isError) {
    return (
      <LoadFailure
        message={t('appointments.detail.slotsLoadError')}
        retrying={slots.isFetching}
        onRetry={() => {
          void slots.refetch();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <fieldset>
        <legend className="sr-only">{t('search.selectASlot')}</legend>
        <div className="grid grid-cols-3 gap-2.5">
          {dayParts.map(({ part: option, icon }) => (
            <label
              key={option}
              className={cn(
                'flex cursor-pointer items-center justify-center gap-2.5 rounded-lg bg-pure-white px-2.5 py-1.5 text-body-xxs font-medium text-grey-800 shadow-md transition-colors duration-fast ease-house touch:min-h-touch',
                'has-checked:bg-secondary has-checked:text-pure-white has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
              )}
            >
              <input
                type="radio"
                name="booking-day-part"
                value={option}
                checked={part === option}
                onChange={() => {
                  setChosenPart(option);
                }}
                className="sr-only"
              />
              <Icon icon={icon} size={16} className="shrink-0" />
              {t(option)}
            </label>
          ))}
        </div>
      </fieldset>
      {slots.isPending ? (
        <div aria-busy="true" className={hourGrid}>
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-6.5 rounded-md touch:h-touch" />
          ))}
        </div>
      ) : inPart.length === 0 ? (
        <p className="text-body-xxs text-text-secondary">
          {t('no_slots_available')}
        </p>
      ) : (
        <fieldset>
          <legend className="sr-only">{t(part)}</legend>
          <div className={hourGrid}>
            {inPart.map((slot) => (
              <HourChip
                key={slot.startTime}
                slot={slot}
                chosen={time === slot.startTime.slice(0, 5)}
                onChoose={chooseTime}
              />
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}

/** As many hours to a row as fit: five in the panel (Figma), four on a phone. */
const hourGrid =
  'grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-2.5';

function HourChip({
  slot,
  chosen,
  onChoose,
}: {
  slot: DaySlot;
  chosen: boolean;
  onChoose: (startTime: string) => void;
}) {
  const t = useTranslations();
  const startTime = slot.startTime.slice(0, 5);
  const label = formatAppointmentTime(startTime);
  const chip =
    'flex items-center justify-center rounded-md px-2 py-1.5 text-body-xxxs shadow-md touch:min-h-touch';

  if (!slot.available) {
    // Taken: said, never offered.
    return (
      // Figma's lighter grey reads under AA: grey-700 keeps 5.6:1.
      <span className={cn(chip, 'bg-white-500 text-grey-700')}>
        <span aria-hidden="true">{label}</span>
        <span className="sr-only">
          {t('specialists.booking.taken', { time: label })}
        </span>
      </span>
    );
  }
  return (
    <label
      className={cn(
        chip,
        // `relative` keeps the hidden radio inside its label.
        'relative cursor-pointer bg-green-50 text-pure-black transition-colors duration-fast ease-house',
        'has-checked:bg-secondary has-checked:text-pure-white has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
      )}
    >
      <input
        type="radio"
        name="booking-hour"
        value={startTime}
        checked={chosen}
        onChange={() => {
          onChoose(startTime);
        }}
        className="sr-only"
      />
      {label}
    </label>
  );
}
