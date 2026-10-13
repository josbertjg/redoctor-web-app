'use client';

import { useId } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { track } from '@/app/lib/analytics/track';
import { failureMessageKey } from '@/app/lib/api/errors';
import type { SessionUser } from '@/app/lib/firebase/client';
import {
  formatAppointmentDay,
  formatAppointmentTime,
  hourAgreement,
} from '@/app/lib/format/appointment-time';
import {
  appointmentKeys,
  cancelAppointment,
} from '@/app/lib/queries/appointments';
import type {
  AppointmentResponse,
  AppointmentSummary,
} from '@/app/lib/schemas/appointments';

import { Button } from '@/app/ui/button';
import { FieldError } from '@/app/ui/field-error';
import { Sheet } from '@/app/ui/sheet';
import { toast } from '@/app/ui/toast';

type CancelSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: AppointmentSummary;
  user: SessionUser;
  onCancelled: (appointment: AppointmentResponse) => void;
};

/*
 * «¿Cancelar esta cita?», the app's confirmation: what will be cancelled,
 * that it cannot be undone, and the two ways out. No reason is asked, as in
 * the app. The sheet stays open until the API answers, so a failure is
 * said where the person is looking.
 */
export function CancelSheet({
  open,
  onOpenChange,
  appointment,
  user,
  onCancelled,
}: CancelSheetProps) {
  const t = useTranslations();
  const queryClient = useQueryClient();

  const cancel = useMutation({
    mutationFn: () => cancelAppointment(user, appointment.id),
    onSuccess: (response) => {
      onCancelled(response);
      onOpenChange(false);
      // The specialist may have cancelled it first (the API then refuses this
      // one): the page shows who did, and nothing claims the patient did.
      if (response.cancelledBy !== 'PATIENT') return;
      track('web_appointment_cancelled', {});
      toast.success(t('appointments.detail.cancelledTitle'), {
        description: t('appointments.detail.cancelledDescriptionPatient'),
      });
    },
    onError: () => {
      // It may have changed meanwhile: the page shows what it is now.
      void queryClient.invalidateQueries({
        queryKey: appointmentKeys.detail(user.id, appointment.id),
      });
    },
  });

  const date = formatAppointmentDay(appointment.date);
  const time = formatAppointmentTime(appointment.startTime);
  const hour = hourAgreement(time);
  const name = appointment.specialist.name;
  const failureKey = cancel.error
    ? failureMessageKey(cancel.error, 'appointments.detail.actionFailed')
    : null;
  const failureId = useId();
  // Every way out forgets a failed try: reopened, the sheet starts clean.
  const close = () => {
    cancel.reset();
    onOpenChange(false);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (next) onOpenChange(true);
        else close();
      }}
      title={t('appointments.detail.cancelTitle')}
      footer={
        <div className="flex flex-col gap-2">
          <FieldError
            id={failureId}
            message={failureKey ? t(failureKey) : undefined}
            className="text-center"
          />
          <Button
            variant="error"
            block
            shape="soft"
            loading={cancel.isPending}
            onClick={() => {
              if (!cancel.isPending) cancel.mutate();
            }}
          >
            {t('appointments.detail.cancelAppointment')}
          </Button>
          <Button variant="white" block shape="soft" onClick={close}>
            {t('back')}
          </Button>
        </div>
      }
    >
      <p className="text-body-md text-text-secondary">
        {name
          ? t('appointments.detail.cancelWarningPatient', {
              name,
              date,
              time,
              hour,
            })
          : t('appointments.detail.cancelWarning', { date, time, hour })}
      </p>
    </Sheet>
  );
}
