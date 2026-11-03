'use client';

import { useId, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { track } from '@/app/lib/analytics/track';
import { failureMessageKey, isApiError } from '@/app/lib/api/errors';
import type { SessionUser } from '@/app/lib/firebase/client';
import {
  formatAppointmentDay,
  formatAppointmentTime,
} from '@/app/lib/format/appointment-time';
import { todayInCaracas } from '@/app/lib/format/date-of-birth';
import {
  appointmentKeys,
  rescheduleAppointment,
  rescheduleAsSpecialist,
} from '@/app/lib/queries/appointments';
import type {
  AppointmentResponse,
  AppointmentSummary,
} from '@/app/lib/schemas/appointments';
import { cn } from '@/app/lib/utils';

import { SlotPicker } from '@/app/ui/appointments/slot-picker';
import { Button } from '@/app/ui/button';
import { FieldError } from '@/app/ui/field-error';
import { Sheet, type SheetStep } from '@/app/ui/sheet';
import { toast } from '@/app/ui/toast';

type RescheduleOptions = {
  appointment: AppointmentSummary;
  user: SessionUser;
  /** Who moves it: the patient (M5), or their specialist from the panel. */
  as?: 'patient' | 'specialist';
  /** Whether the step is on screen: only then are its days and hours read. */
  enabled: boolean;
  onRescheduled: (appointment: AppointmentResponse) => void;
};

/** The month a reschedule opens on: the appointment's, or today's once it is past. */
const startMonth = (appointment: AppointmentSummary, today: string) =>
  (appointment.date >= today ? appointment.date : today).slice(0, 7);

/*
 * «Reprogramar cita», the app's reschedule sheet in one screen: the office
 * (the same one: the API moves an appointment inside its office only), the
 * current day and hour, a month with the days that have free slots, and
 * that day's free hours by morning, afternoon and evening. Nothing is
 * chosen for the person; «Confirmar reprogramación» sends it. The
 * appointment goes back to pending: it is confirmed again 24 h before.
 * The patient moves their own; the specialist, their patient's, through
 * the specialist's endpoint, and the patient is told. A step, so it lives
 * in its own sheet (`RescheduleSheet`) or inside the sheet it was opened
 * from (the agenda's appointment).
 */
export function useRescheduleStep({
  appointment,
  user,
  as = 'patient',
  enabled,
  onRescheduled,
}: RescheduleOptions): SheetStep & { pending: boolean; reset: () => void } {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const [today] = useState(() => todayInCaracas());
  const [month, setMonth] = useState(() => startMonth(appointment, today));
  const [day, setDay] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const problemId = useId();
  const officeId = appointment.office.id ?? '';

  const reschedule = useMutation({
    mutationFn: (slot: { date: string; startTime: string }) =>
      as === 'specialist'
        ? rescheduleAsSpecialist(user, appointment.id, slot)
        : rescheduleAppointment(user, appointment.id, slot),
    onSuccess: (response) => {
      onRescheduled(response);
      track('web_appointment_rescheduled', {});
      toast.success(t('appointments.detail.rescheduledTitle'), {
        description:
          as === 'specialist'
            ? t('appointments.detail.rescheduledDescriptionSpecialist')
            : t('appointments.detail.rescheduledDescriptionPatient'),
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
      const failure = failureMessageKey(
        error,
        'appointments.detail.actionFailed',
      );
      setProblem(failure ? t(failure) : null);
      void queryClient.invalidateQueries({
        queryKey: appointmentKeys.detail(user.id, appointment.id),
      });
    },
  });

  const showHint = problem === null && time === null;

  return {
    title: t('appointments.detail.rescheduleTitle'),
    pending: reschedule.isPending,
    reset: () => {
      reschedule.reset();
      setMonth(startMonth(appointment, today));
      setDay(null);
      setTime(null);
      setProblem(null);
    },
    footer: (
      <div className="flex flex-col gap-2">
        {/* Always mounted: a failure is read aloud as it appears, and the
            hint fades instead of making the footer jump. */}
        <FieldError
          id={problemId}
          message={problem ?? undefined}
          className="text-center"
        />
        <p
          aria-hidden={showHint ? undefined : true}
          className={cn(
            'text-center text-body-sm text-text-secondary transition-opacity duration-base ease-house',
            showHint ? 'opacity-100' : 'opacity-0',
          )}
        >
          {t('appointments.detail.rescheduleHint')}
        </p>
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
    ),
    body: (
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

        <SlotPicker
          user={user}
          officeId={officeId}
          today={today}
          month={month}
          onMonthChange={setMonth}
          day={day}
          onDayChange={(date) => {
            setDay(date);
            setTime(null);
            setProblem(null);
          }}
          time={time}
          onTimeChange={(startTime) => {
            setTime(startTime);
            setProblem(null);
          }}
          enabled={enabled}
        />
      </div>
    ),
  };
}

type RescheduleSheetProps = Omit<RescheduleOptions, 'enabled'> & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** The reschedule in a sheet of its own: the appointment's page (M5). */
export function RescheduleSheet({
  open,
  onOpenChange,
  onRescheduled,
  ...options
}: RescheduleSheetProps) {
  const step = useRescheduleStep({
    ...options,
    enabled: open,
    onRescheduled: (response) => {
      onRescheduled(response);
      onOpenChange(false);
    },
  });

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={step.title}
      footer={step.footer}
    >
      {step.body}
    </Sheet>
  );
}
