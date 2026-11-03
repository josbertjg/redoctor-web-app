'use client';

import { useId, useState } from 'react';

import Alarm from '@material-symbols/svg-400/rounded/alarm.svg?svgr';
import Badge from '@material-symbols/svg-400/rounded/badge.svg?svgr';
import Cake from '@material-symbols/svg-400/rounded/cake.svg?svgr';
import CalendarToday from '@material-symbols/svg-400/rounded/calendar_today.svg?svgr';
import Description from '@material-symbols/svg-400/rounded/description.svg?svgr';
import EventBusy from '@material-symbols/svg-400/rounded/event_busy.svg?svgr';
import LocationOn from '@material-symbols/svg-400/rounded/location_on.svg?svgr';
import Person from '@material-symbols/svg-400/rounded/person.svg?svgr';
import Visibility from '@material-symbols/svg-400/rounded/visibility.svg?svgr';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import type { SessionUser } from '@/app/lib/firebase/client';
import {
  formatAppointmentDay,
  formatAppointmentTime,
} from '@/app/lib/format/appointment-time';
import { ageOn } from '@/app/lib/format/date-of-birth';
import { formatIdentityDocument } from '@/app/lib/format/identity-document';
import { appointmentQueryOptions } from '@/app/lib/queries/appointments';
import {
  statusChips,
  toAppointmentSummary,
  type AppointmentResponse,
  type AppointmentSummary,
} from '@/app/lib/schemas/appointments';
import { cn } from '@/app/lib/utils';

import { AppointmentRecord } from '@/app/ui/appointments/appointment-record';
import { useSpecialistActions } from '@/app/ui/appointments/specialist-actions';
import { statusTones } from '@/app/ui/appointments/status-tones';
import { Avatar } from '@/app/ui/avatar';
import { EmptyState } from '@/app/ui/empty-state';
import { Icon, type IconComponent } from '@/app/ui/icons';
import { Sheet } from '@/app/ui/sheet';

type AppointmentDialogProps = {
  /** The appointment the address opens, or null when none is open. */
  appointmentId: string | null;
  user: SessionUser;
  today: string;
  now: Date;
  /** The appointments the agenda already read: one of them opens at once. */
  listed: readonly AppointmentResponse[];
  /** When they were read, so the copy ages as the list does. */
  listedAt: number;
  /** Whether the agenda's read answered (well or not): only then is the list known. */
  listReady: boolean;
  onClose: () => void;
};

/*
 * «Ver cita» over the agenda (`4669:2206`): `?appointment={id}` in the
 * address, so a link opens it and back closes it. It waits for the agenda's
 * own read: one of the appointments it holds opens from that copy, at once;
 * another (a link from elsewhere) opens once read, or says it was not
 * found. A sheet on phones, a dialog from tablets up; the actions' steps
 * (finishing, the reschedule, the invitation) take the same sheet, one
 * sheet at a time.
 */
export function AppointmentDialog({
  appointmentId,
  listReady,
  ...rest
}: AppointmentDialogProps) {
  // The one open last, kept while its sheet slides away (§8.2).
  const [shownId, setShownId] = useState(appointmentId);
  if (appointmentId !== null && appointmentId !== shownId) {
    setShownId(appointmentId);
  }
  if (shownId === null || !listReady) return null;
  return (
    <AppointmentRead
      key={shownId}
      appointmentId={shownId}
      open={appointmentId !== null}
      {...rest}
    />
  );
}

/** One appointment's read, from the agenda's copy when it has one. */
function AppointmentRead({
  appointmentId,
  open,
  user,
  today,
  now,
  listed,
  listedAt,
  onClose,
}: Omit<AppointmentDialogProps, 'appointmentId' | 'listReady'> & {
  appointmentId: string;
  open: boolean;
}) {
  const fromList = listed.find(
    (appointment) => appointment.id === appointmentId,
  );
  const read = useQuery({
    ...appointmentQueryOptions(user, appointmentId),
    ...(fromList
      ? {
          initialData: { kind: 'found' as const, appointment: fromList },
          initialDataUpdatedAt: listedAt,
        }
      : {}),
  });

  // An appointment once read stays, even if a later read of it fails.
  if (read.data?.kind === 'found') {
    return (
      <LoadedAppointment
        appointment={toAppointmentSummary(read.data.appointment)}
        open={open}
        onClose={onClose}
        user={user}
        today={today}
        now={now}
      />
    );
  }
  if (read.isPending) return null;
  return (
    <MissingAppointment open={open} onClose={onClose} failed={read.isError} />
  );
}

function LoadedAppointment({
  appointment,
  open,
  onClose,
  user,
  today,
  now,
}: {
  appointment: AppointmentSummary;
  open: boolean;
  onClose: () => void;
  user: SessionUser;
  today: string;
  now: Date;
}) {
  const t = useTranslations('panel.agenda');
  const { actions, step, content, closeStep, pending } = useSpecialistActions({
    appointment,
    user,
    now,
  });

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (next || pending) return;
        // The next opening starts at the appointment, not at a step.
        closeStep();
        onClose();
      }}
      title={
        step === null ? (
          <span className="flex items-center gap-2">
            <Icon icon={Visibility} size={24} className="text-primary" />
            {t('viewAppointment')}
          </span>
        ) : (
          content.title
        )
      }
      description={step === null ? undefined : content.description}
      footer={step === null ? undefined : content.footer}
      onBack={step === null ? undefined : closeStep}
      className="sm:max-w-xl"
    >
      {step === null ? (
        <div key="appointment" className="flex animate-fade-in flex-col gap-5">
          <AppointmentPanel appointment={appointment} today={today} />
          <AppointmentRecord appointment={appointment} />
          {actions}
        </div>
      ) : (
        <div key={step} className="animate-fade-in">
          {content.body}
        </div>
      )}
    </Sheet>
  );
}

/** A link to an appointment that is not there (or not this account's). */
function MissingAppointment({
  open,
  onClose,
  failed,
}: {
  open: boolean;
  onClose: () => void;
  failed: boolean;
}) {
  const t = useTranslations('panel.agenda');
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={t('viewAppointment')}
    >
      {failed ? (
        <EmptyState
          headingLevel={3}
          tone="error"
          icon={EventBusy}
          title={t('appointmentLoadError')}
        />
      ) : (
        <EmptyState
          headingLevel={3}
          icon={EventBusy}
          title={t('appointmentNotFound')}
          description={t('appointmentNotFoundDescription')}
        />
      )}
    </Sheet>
  );
}

/*
 * The frame's card: the status as a band, the patient — initials, name,
 * age, sex, document, and the reason as a chip — and «Detalles»: the day,
 * the office, the hours and the notes.
 */
function AppointmentPanel({
  appointment,
  today,
}: {
  appointment: AppointmentSummary;
  today: string;
}) {
  const t = useTranslations();
  const detailsId = useId();
  const { attendee } = appointment;
  const name = `${attendee.firstName} ${attendee.lastName}`.trim();
  const tone = statusTones[appointment.status];
  const chip = statusChips[appointment.status];
  const age = attendee.dateOfBirth ? ageOn(attendee.dateOfBirth, today) : null;
  const facts: { icon: IconComponent; text: string }[] = [
    ...(age === null
      ? []
      : [{ icon: Cake, text: t('panel.agenda.age', { count: age }) }]),
    ...(attendee.sex
      ? [
          {
            icon: Person,
            text: t(attendee.sex === 'MALE' ? 'male' : 'female'),
          },
        ]
      : []),
    ...(attendee.document
      ? [
          {
            icon: Badge,
            text: formatIdentityDocument(
              attendee.document.type,
              attendee.document.number,
            ),
          },
        ]
      : []),
  ];
  const day = formatAppointmentDay(appointment.date);
  const from = formatAppointmentTime(appointment.startTime);

  return (
    <article className="overflow-hidden rounded-2xl bg-pure-white shadow-md">
      <p
        className={cn(
          'py-2.5 text-center text-title-md font-semibold',
          tone.fill,
          tone.text,
        )}
      >
        {t(`appointments.status.${chip.label}`)}
      </p>
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <Avatar name={name} src={null} size="xl" decorative />
          <div className="flex min-w-0 flex-col items-start gap-1.5">
            <h3 className="text-title-lg break-words text-text-primary">
              {name}
            </h3>
            {facts.length > 0 ? (
              <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-md text-text-secondary">
                {facts.map((fact) => (
                  <li key={fact.text} className="flex items-center gap-1">
                    <Icon icon={fact.icon} size={16} className="shrink-0" />
                    {fact.text}
                  </li>
                ))}
              </ul>
            ) : null}
            {appointment.reason ? (
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-label-md text-primary">
                {appointment.reason}
              </span>
            ) : null}
            {appointment.forDependent ? (
              <p className="text-body-sm text-text-secondary">
                {t('appointments.detail.attendeeIsTercero')}
              </p>
            ) : null}
          </div>
        </div>
        <section
          aria-labelledby={detailsId}
          className="flex flex-col gap-3 rounded-xl bg-pure-white p-4 shadow-md sm:p-5"
        >
          <h4 id={detailsId} className="text-title-md text-text-primary">
            {t('panel.agenda.details')}
          </h4>
          <ul className="flex flex-col gap-2.5 text-body-md text-text-primary">
            <DetailRow icon={CalendarToday}>
              <span className="first-letter:uppercase">
                {appointment.date === today
                  ? `${t('panel.agenda.today')}, ${day}`
                  : day}
              </span>
            </DetailRow>
            {appointment.office.name ? (
              <DetailRow icon={LocationOn}>{appointment.office.name}</DetailRow>
            ) : null}
            <DetailRow icon={Alarm}>
              {appointment.endTime
                ? t('panel.agenda.hours', {
                    from,
                    to: formatAppointmentTime(appointment.endTime),
                  })
                : from}
            </DetailRow>
            {appointment.notes ? (
              <DetailRow icon={Description}>{appointment.notes}</DetailRow>
            ) : null}
          </ul>
        </section>
      </div>
    </article>
  );
}

function DetailRow({
  icon,
  children,
}: {
  icon: IconComponent;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-2.5">
      <Icon
        icon={icon}
        size={18}
        className="mt-0.5 shrink-0 text-text-secondary"
      />
      <span className="min-w-0 break-words">{children}</span>
    </li>
  );
}
