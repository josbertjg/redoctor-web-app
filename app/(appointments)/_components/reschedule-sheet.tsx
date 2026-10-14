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
} from '@/app/lib/queries/appointments';
import type {
  AppointmentResponse,
  AppointmentSummary,
} from '@/app/lib/schemas/appointments';
import { cn } from '@/app/lib/utils';

import { Button } from '@/app/ui/button';
import { FieldError } from '@/app/ui/field-error';
import { Sheet } from '@/app/ui/sheet';
import { toast } from '@/app/ui/toast';

import { SlotPicker } from './slot-picker';

type RescheduleSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: AppointmentSummary;
  user: SessionUser;
  onRescheduled: (appointment: AppointmentResponse) => void;
};

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

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t('appointments.detail.rescheduleTitle')}
      footer={
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
          enabled={open}
        />
      </div>
    </Sheet>
  );
}
