'use client';

import { useState, type ReactNode } from 'react';

import Stethoscope from '@material-symbols/svg-400/rounded/stethoscope.svg?svgr';
import { useTranslations } from 'next-intl';

import type { SessionUser } from '@/app/lib/firebase/client';
import { formatBirthDate } from '@/app/lib/format/date-of-birth';
import { formatIdentityDocument } from '@/app/lib/format/identity-document';
import { routes } from '@/app/lib/routes';
import {
  appointmentActions,
  statusChips,
  type AppointmentSummary,
} from '@/app/lib/schemas/appointments';

import { OpenInAppButton } from '@/app/ui/app-bridge/open-in-app-button';
import {
  AppointmentDetails,
  type PatientFact,
} from '@/app/ui/appointments/appointment-details';
import { AppointmentHeadline } from '@/app/ui/appointments/appointment-headline';
import { StateChip } from '@/app/ui/state-chip';
import { StatusCard } from '@/app/ui/status-card';

import { AppointmentActionsCard } from './appointment-actions';
import { AppointmentRecord } from './appointment-record';

type AppointmentViewProps = {
  appointment: AppointmentSummary;
  user: SessionUser;
  /** A specialist's (or an admin's) look at their patient's appointment. */
  readOnly: boolean;
};

/*
 * The appointment (M5), as the app's patient detail shows it: its state,
 * who and when, what can be done, where and how much, who attends and why,
 * and what happened to it. The actions come first on the page.
 */
export function AppointmentView({
  appointment,
  user,
  readOnly,
}: AppointmentViewProps) {
  const t = useTranslations();
  // What can be done is decided once per page: an action brings a fresh
  // appointment, and the page is opened again to see a later moment.
  const [now] = useState(() => new Date());
  const chip = statusChips[appointment.status];

  return (
    <AppointmentFrame
      chip={
        <StateChip tone={chip.tone}>
          {t(`appointments.status.${chip.label}`)}
        </StateChip>
      }
    >
      <AppointmentHeadline appointment={appointment} />
      {readOnly ? (
        <StatusCard
          icon={Stethoscope}
          title={t('appointments.detail.forSpecialists')}
          description={t('appointments.detail.forSpecialistsDescription')}
        >
          {/* The specialist has the app; patients do not in the pilot (§6). */}
          <OpenInAppButton path={routes.appointment(appointment.id)} />
        </StatusCard>
      ) : (
        <AppointmentActionsCard
          appointment={appointment}
          actions={appointmentActions(appointment, now)}
          user={user}
        />
      )}
      <AppointmentDetails
        appointment={appointment}
        patient={usePatient(appointment)}
      />
      <AppointmentRecord appointment={appointment} />
    </AppointmentFrame>
  );
}

/** The patient's section: someone in one's care in full, and always the reason and the notes. */
function usePatient(appointment: AppointmentSummary) {
  const t = useTranslations();
  const { attendee, forDependent } = appointment;
  const facts: PatientFact[] = [];
  if (forDependent) {
    if (attendee.document) {
      facts.push({
        term: t('identityDocument'),
        value: formatIdentityDocument(
          attendee.document.type,
          attendee.document.number,
        ),
      });
    }
    if (attendee.dateOfBirth) {
      facts.push({
        term: t('dateOfBirth'),
        value: formatBirthDate(attendee.dateOfBirth),
      });
    }
    if (attendee.sex) {
      facts.push({
        term: t('sex'),
        value: t(attendee.sex === 'MALE' ? 'male' : 'female'),
      });
    }
  }
  facts.push({
    term: t('appointments.detail.reason'),
    value: appointment.reason ?? t('appointments.detail.noReason'),
  });
  if (appointment.notes) {
    facts.push({
      term: t('appointments.detail.notes'),
      value: appointment.notes,
    });
  }
  return {
    heading: t('appointments.detail.patient'),
    name: forDependent ? `${attendee.firstName} ${attendee.lastName}` : null,
    facts,
    note: forDependent ? t('appointments.detail.attendeeIsTercero') : undefined,
  };
}

/** The page's column: its heading with the state, then the cards. */
export function AppointmentFrame({
  chip,
  children,
}: {
  chip?: ReactNode;
  children: ReactNode;
}) {
  const t = useTranslations('appointments.detail');
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-headline-sm text-text-primary">{t('title')}</h1>
        {chip}
      </div>
      {children}
    </div>
  );
}
