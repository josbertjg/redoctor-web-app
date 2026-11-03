'use client';

import { useState } from 'react';

import Link from 'next/link';

import Add from '@material-symbols/svg-400/rounded/add.svg?svgr';
import CheckCircle from '@material-symbols/svg-400/rounded/check_circle.svg?svgr';
import EventBusy from '@material-symbols/svg-400/rounded/event_busy.svg?svgr';
import Share from '@material-symbols/svg-400/rounded/share.svg?svgr';
import WorkspacePremium from '@material-symbols/svg-400/rounded/workspace_premium.svg?svgr';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { failureMessageKey, isApiError } from '@/app/lib/api/errors';
import type { SessionUser } from '@/app/lib/firebase/client';
import {
  formatAppointmentDay,
  formatAppointmentTime,
} from '@/app/lib/format/appointment-time';
import { staleQueryKeys } from '@/app/lib/notifications/effects';
import {
  appointmentKeys,
  bookAsSpecialist,
} from '@/app/lib/queries/appointments';
import { subscriptionQueryOptions } from '@/app/lib/queries/billing';
import { myOfficesQueryOptions } from '@/app/lib/queries/offices';
import { myProfileQueryOptions } from '@/app/lib/queries/specialists';
import { routes } from '@/app/lib/routes';
import {
  toAppointmentSummary,
  type AppointmentResponse,
  type SpecialistBookingRequest,
} from '@/app/lib/schemas/appointments';
import { bookingSpecialtyId } from '@/app/lib/schemas/booking';
import { cn } from '@/app/lib/utils';

import { SlotPicker } from '@/app/ui/appointments/slot-picker';
import { useShareInvitationStep } from '@/app/ui/appointments/specialist-actions';
import { Button } from '@/app/ui/button';
import { EmptyState } from '@/app/ui/empty-state';
import { Icon } from '@/app/ui/icons';
import { SelectField } from '@/app/ui/select-field';
import { Sheet, type SheetStep } from '@/app/ui/sheet';
import { Skeleton } from '@/app/ui/skeleton';

import { useWhoStep } from './who-step';

type NewAppointmentDialogProps = {
  open: boolean;
  user: SessionUser;
  today: string;
  onClose: () => void;
  /** «Ver citas»: the agenda of the new appointment's day. */
  onSeeDay: (date: string) => void;
};

/*
 * «Nueva cita» (`4662:370`, `4663:3952`, `4664:4414`): `?new=1` on the
 * agenda's address. A fresh form each time it opens; the one that closes
 * stays while it slides away (§8.2).
 */
export function NewAppointmentDialog({
  open,
  ...rest
}: NewAppointmentDialogProps) {
  const [round, setRound] = useState(0);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setRound((current) => current + 1);
  }
  return <NewAppointment key={round} open={open} {...rest} />;
}

type Step = 'when' | 'who' | 'done' | 'share';

/*
 * The specialist books a patient, as the app's «Crear cita» does, in one
 * sheet: when — the office (the first active one chosen), the month's free
 * days and the day's free hours, side by side from tablets up —; who — a
 * registered patient found as the document or the names are typed, or
 * someone new, and the reason with its price —; and «¡Todo listo!», with
 * the invitation to share when the patient has no account. A plan that
 * does not allow booking offers the plans instead (§1); with no active
 * office, the app is where one turns on. A slot taken meanwhile (ERR_4002)
 * goes back to the hours with the app's words, what was typed kept.
 */
function NewAppointment({
  open,
  user,
  today,
  onClose,
  onSeeDay,
}: NewAppointmentDialogProps) {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const current = useQuery({
    ...subscriptionQueryOptions(user),
    enabled: open,
  });
  const offices = useQuery({ ...myOfficesQueryOptions(user), enabled: open });
  const profile = useQuery({ ...myProfileQueryOptions(user), enabled: open });
  const active = (offices.data ?? []).filter((office) => office.isActive);
  const [step, setStep] = useState<Step>('when');
  const [chosenOffice, setChosenOffice] = useState<string | null>(null);
  const officeId = chosenOffice ?? active[0]?.id ?? '';
  const [month, setMonth] = useState(today.slice(0, 7));
  const [day, setDay] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [hint, setHint] = useState(false);
  const [slotTaken, setSlotTaken] = useState(false);
  const [bookProblem, setBookProblem] = useState<string | null>(null);
  const [booked, setBooked] = useState<AppointmentResponse | null>(null);
  // The specialty only when the profile practises one branch (REDOC-251).
  const specialtyId = bookingSpecialtyId(
    (profile.data?.specialties ?? [])
      .filter((specialty) => specialty.review === 'verified')
      .map((specialty) => ({
        id: specialty.specialtyId,
        name: specialty.name,
        path: specialty.path,
      })),
  );

  const book = useMutation({
    mutationFn: ({
      patient,
      reasonId,
    }: {
      patient: SpecialistBookingRequest['patient'];
      reasonId: string | null;
    }) =>
      bookAsSpecialist(user, {
        officeId,
        date: day ?? '',
        startTime: time ?? '',
        specialtyId,
        reasonId,
        patient,
      }),
    onSuccess: (appointment) => {
      queryClient.setQueryData(
        appointmentKeys.detail(user.id, appointment.id),
        { kind: 'found', appointment },
      );
      // The agenda, the history and the statistics read again: this tab
      // sees no echo of its own writes.
      for (const queryKey of [
        appointmentKeys.specialistLists(user.id),
        ...staleQueryKeys('statistics', user.id),
      ]) {
        void queryClient.invalidateQueries({ queryKey });
      }
      setBooked(appointment);
      setStep('done');
    },
    onError: (error) => {
      if (isApiError(error) && error.code === 'ERR_4002') {
        // Someone took it meanwhile: back to the hours, read again.
        setTime(null);
        setSlotTaken(true);
        void queryClient.invalidateQueries({
          queryKey: appointmentKeys.slots(officeId, day ?? ''),
        });
        setStep('when');
        return;
      }
      if (isApiError(error) && error.code === 'ERR_5052') {
        // The plan ended meanwhile: the plans are offered instead.
        void queryClient.invalidateQueries({
          queryKey: subscriptionQueryOptions(user).queryKey,
        });
        return;
      }
      const failure = failureMessageKey(
        error,
        'appointments.booking.bookFailed',
      );
      setBookProblem(failure ? t(failure) : null);
    },
  });

  const who = useWhoStep({
    user,
    officeId,
    today,
    enabled: open && step === 'who',
    booking: book.isPending,
    problem: bookProblem,
    onBack: () => {
      setStep('when');
    },
    onBook: (patient, reasonId) => {
      if (book.isPending) return;
      setBookProblem(null);
      book.mutate({ patient, reasonId });
    },
  });
  const bookedSummary = booked ? toAppointmentSummary(booked) : null;
  const share = useShareInvitationStep({
    appointment: bookedSummary,
    user,
    enabled: open && step === 'share',
  });

  const title = t('appointments.booking.title');
  const when: SheetStep = {
    title,
    body: (
      <div className="flex flex-col gap-5 rounded-2xl bg-pure-white p-4 shadow-md sm:p-6">
        {slotTaken ? (
          <div
            role="alert"
            className="flex animate-fade-in flex-col gap-0.5 rounded-lg bg-warning-50 px-4 py-3"
          >
            <p className="text-body-md font-semibold text-text-primary">
              {t('appointments.booking.slotTakenTitle')}
            </p>
            <p className="text-body-sm text-text-secondary">
              {t('appointments.booking.slotTakenDescription')}
            </p>
          </div>
        ) : null}
        {active.length > 1 ? (
          <SelectField
            label={t('appointments.booking.office')}
            value={officeId}
            onChange={(event) => {
              setChosenOffice(event.target.value);
              setDay(null);
              setTime(null);
            }}
            options={active.map((office) => ({
              value: office.id,
              label: office.name,
            }))}
            className="sm:max-w-sm"
          />
        ) : (
          <p className="flex flex-col text-body-md text-text-primary">
            <span className="text-label-md text-text-secondary">
              {t('appointments.booking.office')}
            </span>
            {active[0]?.name}
          </p>
        )}
        {/* The month and the day's hours side by side, as the frame. */}
        <div className="grid items-start gap-6 md:grid-cols-2">
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
              setHint(false);
            }}
            time={time}
            onTimeChange={(startTime) => {
              setTime(startTime);
              setHint(false);
              setSlotTaken(false);
            }}
            enabled={open && step === 'when' && officeId !== ''}
          />
        </div>
      </div>
    ),
    footer: (
      <div className="flex flex-col gap-2">
        <p
          aria-live="polite"
          className={cn(
            'text-center text-body-sm text-text-secondary transition-opacity duration-base ease-house',
            hint ? 'opacity-100' : 'opacity-0',
          )}
        >
          {hint ? t('appointments.detail.rescheduleHint') : null}
        </p>
        <div className="flex justify-end">
          <Button
            shape="soft"
            onClick={() => {
              if (day === null || time === null) {
                setHint(true);
                return;
              }
              setStep('who');
            }}
          >
            {t('appointments.booking.next')}
          </Button>
        </div>
      </div>
    ),
  };

  const invited = booked !== null && !booked.patientUserId;
  const done: SheetStep = {
    title: t('appointments.booking.successTitle'),
    body: bookedSummary ? (
      <div className="flex animate-fade-up flex-col items-center gap-3 py-4 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-success-light text-success">
          <Icon icon={CheckCircle} size={24} />
        </span>
        <p className="text-title-lg text-text-primary">
          {t('appointments.booking.successSubtitle')}
        </p>
        <p className="text-body-md text-text-primary first-letter:uppercase">
          {`${bookedSummary.attendee.firstName} ${bookedSummary.attendee.lastName}`.trim()}
          {' · '}
          {formatAppointmentDay(bookedSummary.date)},{' '}
          {formatAppointmentTime(bookedSummary.startTime)}
        </p>
        <p className="max-w-md text-body-md text-text-secondary">
          {invited
            ? t('appointments.booking.successInvited')
            : t('appointments.booking.successRegistered')}
        </p>
      </div>
    ) : null,
    footer: (
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          shape="soft"
          variant={invited ? 'white' : 'primary'}
          onClick={() => {
            if (booked) onSeeDay(booked.slot.date);
          }}
        >
          {t('appointments.booking.seeAppointments')}
        </Button>
        {invited ? (
          <Button
            shape="soft"
            onClick={() => {
              setStep('share');
            }}
          >
            <Icon icon={Share} size={20} />
            {t('appointments.detail.shareInvitation')}
          </Button>
        ) : null}
      </div>
    ),
  };

  const content: SheetStep =
    current.isPending || offices.isPending
      ? {
          title,
          body: (
            <div aria-busy="true" className="flex flex-col gap-4">
              <Skeleton className="h-control w-full max-w-sm" />
              <Skeleton className="h-72 w-full rounded-2xl" />
            </div>
          ),
        }
      : current.data?.access.hasAccess === false && booked === null
        ? {
            title,
            body: (
              <EmptyState
                headingLevel={3}
                icon={WorkspacePremium}
                title={t('appointments.booking.needsPlanTitle')}
                description={t('appointments.booking.needsPlanDescription')}
                action={
                  <Button asChild shape="soft">
                    {current.data.subscription ? (
                      <Link href={routes.subscription()}>
                        {t('appointments.booking.seeSubscription')}
                      </Link>
                    ) : (
                      <Link href={routes.subscriptionPlans()}>
                        {t('appointments.booking.seePlans')}
                      </Link>
                    )}
                  </Button>
                }
              />
            ),
          }
        : active.length === 0
          ? {
              title,
              body: (
                <EmptyState
                  headingLevel={3}
                  icon={EventBusy}
                  title={t('appointments.booking.noActiveOfficeTitle')}
                  description={t(
                    'appointments.booking.noActiveOfficeDescription',
                  )}
                />
              ),
            }
          : step === 'when'
            ? when
            : step === 'who'
              ? who
              : step === 'done'
                ? done
                : share;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next && !book.isPending) onClose();
      }}
      title={
        step === 'when' || step === 'who' ? (
          <span className="flex items-center gap-2">
            <Icon icon={Add} size={24} className="text-primary" />
            {content.title}
          </span>
        ) : (
          content.title
        )
      }
      description={content.description}
      footer={content.footer}
      onBack={
        step === 'share'
          ? () => {
              setStep('done');
            }
          : undefined
      }
      className="sm:max-w-3xl"
    >
      <div key={step} className="animate-fade-in">
        {content.body}
      </div>
    </Sheet>
  );
}
