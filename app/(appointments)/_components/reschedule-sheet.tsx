'use client';

import { useEffect, useId, useRef, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { track } from '@/app/lib/analytics/track';
import { isApiError } from '@/app/lib/api/errors';
import type { SessionUser } from '@/app/lib/firebase/client';
import {
  formatAppointmentDay,
  formatAppointmentTime,
} from '@/app/lib/format/appointment-time';
import { todayInCaracas } from '@/app/lib/format/date-of-birth';
import {
  appointmentKeys,
  availableDaysQueryOptions,
  daySlotsQueryOptions,
  rescheduleAppointment,
} from '@/app/lib/queries/appointments';
import type {
  AppointmentResponse,
  AppointmentSummary,
} from '@/app/lib/schemas/appointments';
import {
  dayPartOf,
  freeDays,
  type DayPart,
  type DaySlot,
} from '@/app/lib/schemas/availability';
import { cn } from '@/app/lib/utils';

import { Button } from '@/app/ui/button';
import { FieldError } from '@/app/ui/field-error';
import { useReducedMotion } from '@/app/ui/motion';
import { Sheet } from '@/app/ui/sheet';
import { Skeleton } from '@/app/ui/skeleton';
import { toast } from '@/app/ui/toast';

import { actionFailure } from './action-failure';
import { MonthCalendar } from './month-calendar';

type RescheduleSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: AppointmentSummary;
  user: SessionUser;
  onRescheduled: (appointment: AppointmentResponse) => void;
};

const dayParts: readonly DayPart[] = ['morning', 'afternoon', 'evening'];

/*
 * «Reprogramar cita», the app's reschedule sheet in one screen: the office
 * (the same one: the API moves an appointment inside its office only), the
 * current day and hour, a month with the days that have free slots, and
 * that day's free hours by morning, afternoon and evening. Nothing is
 * chosen for the person; «Confirmar reprogramación» sends it. The
 * appointment goes back to pending: it is confirmed again 24 h before.
 */
export function RescheduleSheet({
  open,
  onOpenChange,
  appointment,
  user,
  onRescheduled,
}: RescheduleSheetProps) {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const [today] = useState(() => todayInCaracas());
  const [month, setMonth] = useState(() =>
    (appointment.date >= today ? appointment.date : today).slice(0, 7),
  );
  const [day, setDay] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const problemId = useId();
  const officeId = appointment.office.id ?? '';
  const hours = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();

  // The month fills a phone's screen: a chosen day brings its hours into
  // view, or they would appear below the fold, unseen.
  useEffect(() => {
    if (day === null) return;
    hours.current?.scrollIntoView({
      block: 'nearest',
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  }, [day, reducedMotion]);

  const days = useQuery({
    ...availableDaysQueryOptions(user, officeId, month),
    enabled: open && officeId !== '',
  });
  const free = days.data ? freeDays(days.data.days) : new Set<string>();
  const dayIsFree = day !== null && free.has(day) && day >= today;
  const slots = useQuery({
    ...daySlotsQueryOptions(user, officeId, day ?? ''),
    enabled: open && officeId !== '' && dayIsFree,
  });

  const reschedule = useMutation({
    mutationFn: (slot: { date: string; startTime: string }) =>
      rescheduleAppointment(user, appointment.id, slot),
    onSuccess: (response) => {
      onRescheduled(response);
      onOpenChange(false);
      track('web_appointment_rescheduled', {});
      toast.success(t('appointments.detail.rescheduledTitle'), {
        description: t('appointments.detail.rescheduledDescriptionPatient'),
      });
    },
    onError: (error, slot) => {
      if (isApiError(error) && error.code === 'ERR_4002') {
        // Someone took it meanwhile: read the day again, choose again.
        setTime(null);
        setProblem(t('appointments.detail.slotTaken'));
        void queryClient.invalidateQueries({
          queryKey: appointmentKeys.slots(officeId, slot.date),
        });
        return;
      }
      const failure = actionFailure(error);
      setProblem(failure ? t(failure) : null);
      void queryClient.invalidateQueries({
        queryKey: appointmentKeys.detail(user.id, appointment.id),
      });
    },
  });

  const freeSlots = (slots.data?.slots ?? []).filter((slot) => slot.available);
  const hint =
    problem ?? (time === null ? t('appointments.detail.rescheduleHint') : null);

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t('appointments.detail.rescheduleTitle')}
      footer={
        <div className="flex flex-col gap-2">
          {problem ? (
            <FieldError
              id={problemId}
              message={problem}
              className="text-center"
            />
          ) : hint ? (
            <p className="text-center text-body-sm text-text-secondary">
              {hint}
            </p>
          ) : null}
          <Button
            block
            shape="soft"
            loading={reschedule.isPending}
            onClick={() => {
              if (reschedule.isPending) return;
              if (day === null || time === null) {
                setProblem(t('appointments.detail.rescheduleHint'));
                return;
              }
              setProblem(null);
              reschedule.mutate({ date: day, startTime: time });
            }}
          >
            {t('appointments.detail.confirmReschedule')}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <dl className="grid gap-2 text-body-md">
          {appointment.office.name ? (
            <div>
              <dt className="text-label-md text-text-secondary">
                {t('appointments.detail.office')}
              </dt>
              <dd className="text-text-primary">{appointment.office.name}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-label-md text-text-secondary">
              {t('appointments.detail.currentSchedule')}
            </dt>
            <dd className="text-text-primary first-letter:uppercase">
              {formatAppointmentDay(appointment.date)},{' '}
              {formatAppointmentTime(appointment.startTime)}
            </dd>
          </div>
        </dl>

        <section className="flex flex-col gap-2">
          <h3 className="text-title-sm text-text-primary">{t('pickADate')}</h3>
          <MonthCalendar
            month={month}
            today={today}
            freeDays={free}
            loading={days.isPending && officeId !== ''}
            selected={day}
            onMonthChange={setMonth}
            onSelect={(date) => {
              setDay(date);
              setTime(null);
              setProblem(null);
            }}
          />
        </section>

        {day !== null ? (
          <section ref={hours} className="flex flex-col gap-3">
            <h3 className="text-title-sm text-text-primary">
              {t('appointments.detail.selectASlot')}
            </h3>
            {!dayIsFree ? (
              <p className="text-body-md text-text-secondary">
                {t('no_slots_available')}
              </p>
            ) : slots.isPending ? (
              <div aria-busy="true" className="grid grid-cols-3 gap-2">
                {Array.from({ length: 6 }, (_, index) => (
                  <Skeleton key={index} className="h-control w-full" />
                ))}
              </div>
            ) : freeSlots.length === 0 ? (
              <p className="text-body-md text-text-secondary">
                {t('no_slots_available')}
              </p>
            ) : (
              <SlotChoices
                slots={freeSlots}
                selected={time}
                onSelect={(startTime) => {
                  setTime(startTime);
                  setProblem(null);
                }}
              />
            )}
          </section>
        ) : null}
      </div>
    </Sheet>
  );
}

function SlotChoices({
  slots,
  selected,
  onSelect,
}: {
  slots: readonly DaySlot[];
  selected: string | null;
  onSelect: (startTime: string) => void;
}) {
  const t = useTranslations();

  return (
    <div className="flex flex-col gap-4">
      {dayParts.map((part) => {
        const inPart = slots.filter(
          (slot) => dayPartOf(slot.startTime) === part,
        );
        if (inPart.length === 0) return null;
        return (
          <fieldset key={part} className="flex flex-col gap-2">
            <legend className="mb-2 text-label-md text-text-secondary">
              {t(part)}
            </legend>
            <div className="grid grid-cols-3 gap-2">
              {inPart.map((slot) => {
                const startTime = slot.startTime.slice(0, 5);
                return (
                  <label
                    key={startTime}
                    className={cn(
                      // `relative` keeps the hidden radio inside its label,
                      // so focusing it never scrolls the sheet elsewhere.
                      'relative flex min-h-touch cursor-pointer items-center justify-center rounded-md border-2 border-transparent bg-pure-white px-2 text-body-xs text-text-primary shadow-sm transition-colors duration-fast ease-house',
                      'has-checked:border-primary has-checked:bg-blue-50 has-checked:text-primary has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
                    )}
                  >
                    <input
                      type="radio"
                      name="slot"
                      value={startTime}
                      checked={selected === startTime}
                      onChange={() => {
                        onSelect(startTime);
                      }}
                      className="sr-only"
                    />
                    {formatAppointmentTime(startTime)}
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
