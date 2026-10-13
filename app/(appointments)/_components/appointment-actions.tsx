'use client';

import { useState } from 'react';

import Autorenew from '@material-symbols/svg-400/rounded/autorenew.svg?svgr';
import Close from '@material-symbols/svg-400/rounded/close.svg?svgr';
import Schedule from '@material-symbols/svg-400/rounded/schedule.svg?svgr';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { track } from '@/app/lib/analytics/track';
import { isApiError } from '@/app/lib/api/errors';
import type { SessionUser } from '@/app/lib/firebase/client';
import { formatInstant } from '@/app/lib/format/appointment-time';
import {
  appointmentKeys,
  confirmAppointment,
} from '@/app/lib/queries/appointments';
import type {
  AppointmentActions,
  AppointmentResponse,
  AppointmentSummary,
} from '@/app/lib/schemas/appointments';

import { Button } from '@/app/ui/button';
import { Icon } from '@/app/ui/icons';
import { toast } from '@/app/ui/toast';

import { actionFailure } from './action-failure';
import { CalendarMenu } from './calendar-menu';
import { CancelSheet } from './cancel-sheet';
import { RescheduleSheet } from './reschedule-sheet';

type AppointmentActionsCardProps = {
  appointment: AppointmentSummary;
  actions: AppointmentActions;
  user: SessionUser;
};

/*
 * What the patient can do, first on the page (the confirmation email says
 * so: «La página muestra Confirmar primero»): «Confirmar cita» when its
 * window is open, or when it opens; then «Reprogramar» and «Cancelar»,
 * each in its sheet, and «Agregar al calendario». After each change the
 * page shows the appointment the API answered.
 */
export function AppointmentActionsCard({
  appointment,
  actions,
  user,
}: AppointmentActionsCardProps) {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const [sheet, setSheet] = useState<'cancel' | 'reschedule' | null>(null);
  /** A fresh reschedule sheet each time it opens: nothing left chosen. */
  const [rescheduleRound, setRescheduleRound] = useState(0);
  const key = appointmentKeys.detail(user.id, appointment.id);
  const show = (response: AppointmentResponse) => {
    queryClient.setQueryData(key, { kind: 'found', appointment: response });
    // The list (M6) reads it again next time it shows.
    void queryClient.invalidateQueries({
      queryKey: appointmentKeys.list(user.id),
    });
  };

  const confirm = useMutation({
    mutationFn: () => confirmAppointment(user, appointment.id),
    onSuccess: (response) => {
      show(response);
      track('web_appointment_confirmed', {});
      toast.success(t('appointments.detail.confirmedTitle'), {
        description: t('appointments.detail.confirmedDescription'),
      });
    },
    onError: (error) => {
      if (isApiError(error) && error.code === 'ERR_4013') {
        toast.warning(t('appointments.detail.confirmWindowClosedTitle'), {
          description: t('appointments.detail.confirmWindowClosedDescription'),
        });
      } else {
        const failure = actionFailure(error);
        if (failure) toast.error(t(failure));
      }
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });

  if (!actions.confirm && !actions.change && !actions.calendar) return null;
  const opens =
    actions.confirm?.kind === 'later'
      ? formatInstant(actions.confirm.opensAt)
      : null;

  return (
    <div className="flex animate-fade-up flex-col gap-3 rounded-2xl bg-pure-white p-5 shadow-md">
      {opens ? (
        <p className="flex items-start gap-2 text-body-md text-text-secondary">
          <Icon
            icon={Schedule}
            size={20}
            className="mt-0.5 shrink-0 text-primary"
          />
          {t('appointments.detail.confirmWindowOpensAt', opens)}
        </p>
      ) : null}
      {actions.confirm?.kind === 'now' ? (
        <Button
          block
          shape="soft"
          loading={confirm.isPending}
          onClick={() => {
            if (!confirm.isPending) confirm.mutate();
          }}
        >
          {t('appointments.detail.confirmAppointment')}
        </Button>
      ) : null}
      {actions.change ? (
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="white"
            shape="soft"
            onClick={() => {
              setRescheduleRound((round) => round + 1);
              setSheet('reschedule');
            }}
          >
            <Icon icon={Autorenew} size={20} />
            {t('appointments.detail.reschedule')}
          </Button>
          <Button
            variant="white"
            shape="soft"
            className="text-error-700"
            onClick={() => {
              setSheet('cancel');
            }}
          >
            <Icon icon={Close} size={20} />
            {t('cancel')}
          </Button>
        </div>
      ) : null}
      {actions.calendar ? <CalendarMenu appointment={appointment} /> : null}

      <CancelSheet
        open={sheet === 'cancel'}
        onOpenChange={(open) => {
          setSheet(open ? 'cancel' : null);
        }}
        appointment={appointment}
        user={user}
        onCancelled={show}
      />
      <RescheduleSheet
        key={rescheduleRound}
        open={sheet === 'reschedule'}
        onOpenChange={(open) => {
          setSheet(open ? 'reschedule' : null);
        }}
        appointment={appointment}
        user={user}
        onRescheduled={show}
      />
    </div>
  );
}
