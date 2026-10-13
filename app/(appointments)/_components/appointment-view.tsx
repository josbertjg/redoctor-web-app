'use client';

import { useEffect, useState, type ReactNode } from 'react';

import Link from 'next/link';

import Stethoscope from '@material-symbols/svg-400/rounded/stethoscope.svg?svgr';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import type { SessionUser } from '@/app/lib/firebase/client';
import { formatBirthDate } from '@/app/lib/format/date-of-birth';
import { formatIdentityDocument } from '@/app/lib/format/identity-document';
import { appointmentKeys } from '@/app/lib/queries/appointments';
import {
  pendingReviewsQueryOptions,
  reviewKeys,
} from '@/app/lib/queries/reviews';
import { routes } from '@/app/lib/routes';
import {
  appointmentActions,
  statusChips,
  type AppointmentResponse,
  type AppointmentSummary,
} from '@/app/lib/schemas/appointments';

import { OpenInAppButton } from '@/app/ui/app-bridge/open-in-app-button';
import {
  AppointmentDetails,
  type PatientFact,
} from '@/app/ui/appointments/appointment-details';
import { AppointmentHeadline } from '@/app/ui/appointments/appointment-headline';
import { Button } from '@/app/ui/button';
import { StateChip } from '@/app/ui/state-chip';
import { StatusCard } from '@/app/ui/status-card';

import { useFocusHeading } from '@/app/hooks/use-focus-heading';

import { AppointmentActionsCard } from './appointment-actions';
import { AppointmentRecord } from './appointment-record';
import { ReviewForm } from './review-form';

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
  const queryClient = useQueryClient();
  const [now, setNow] = useState(() => new Date());
  const chip = statusChips[appointment.status];
  // After a change (confirmed, moved, cancelled) the focus goes to the page's
  // heading: the button that was pressed may be gone.
  const frame = useFocusHeading(appointment.status);

  // What can be done changes at two moments: when the confirmation window
  // opens and when the appointment starts (nothing changes after it, as
  // REDOC-308 asks). The page follows at that very moment, without polling:
  // it reads the appointment again, since whether it can be confirmed is the
  // API's to say.
  useEffect(() => {
    const next = nextChange(appointment, now);
    if (next === null) return;
    const timer = window.setTimeout(() => {
      setNow(new Date());
      void queryClient.invalidateQueries({
        queryKey: appointmentKeys.detail(user.id, appointment.id),
      });
    }, next);
    return () => {
      window.clearTimeout(timer);
    };
  }, [appointment, now, queryClient, user.id]);

  return (
    <AppointmentFrame
      ref={frame}
      chip={
        <StateChip tone={chip.tone}>
          {t(`appointments.status.${chip.label}`)}
        </StateChip>
      }
    >
      <AppointmentHeadline
        appointment={appointment}
        viewer={readOnly ? 'specialist' : 'patient'}
      />
      {readOnly ? (
        <StatusCard
          icon={Stethoscope}
          title={t('appointments.detail.forSpecialists')}
          description={t('appointments.detail.forSpecialistsDescription')}
        >
          {/* The specialist has the app; patients do not in the pilot (§6).
            On a computer the panel is where they are: no note to go to the phone. */}
          <OpenInAppButton
            path={routes.appointment(appointment.id)}
            desktop="none"
          />
        </StatusCard>
      ) : (
        <>
          <PendingReview appointment={appointment} user={user} />
          <AppointmentActionsCard
            appointment={appointment}
            actions={appointmentActions(appointment, now)}
            user={user}
          />
        </>
      )}
      <AppointmentDetails
        appointment={appointment}
        patient={usePatient(appointment, readOnly)}
      />
      <AppointmentRecord appointment={appointment} />
      {readOnly ? (
        // The specialist's day, in their panel (M14).
        <Button
          asChild
          variant="white"
          shape="soft"
          className="animate-fade-up"
        >
          <Link href={{ pathname: routes.agenda(appointment.date) }}>
            {t('appointments.detail.backToAgenda')}
          </Link>
        </Button>
      ) : (
        // The patient's other appointments (M6).
        <Button
          asChild
          variant="white"
          shape="soft"
          className="animate-fade-up"
        >
          <Link href={routes.appointments()}>
            {t('appointments.detail.seeMine')}
          </Link>
        </Button>
      )}
    </AppointmentFrame>
  );
}

/*
 * A finished consultation still to rate, on its own page: the email that
 * asks for the rating (15, «Dejar mi reseña») leads here, so the stars are
 * here too, first on the page. It never holds the page (AGENTS.md §1: a
 * page reached through a link is never blocked); once sent, it goes.
 */
function PendingReview({
  appointment,
  user,
}: {
  appointment: AppointmentSummary;
  user: SessionUser;
}) {
  const t = useTranslations('reviews.gate');
  const queryClient = useQueryClient();
  const finished = appointment.status === 'COMPLETED';
  const pending = useQuery({
    ...pendingReviewsQueryOptions(user),
    enabled: finished,
  });
  const toRate =
    finished &&
    (pending.data ?? []).some((candidate) => candidate.id === appointment.id);
  if (!toRate) return null;

  return (
    <section
      aria-label={t('title')}
      className="flex animate-fade-up flex-col gap-3"
    >
      <h2 className="text-title-lg text-text-primary">{t('title')}</h2>
      <ReviewForm
        appointment={appointment}
        user={user}
        withConsultation={false}
        onSubmitted={() => {
          queryClient.setQueryData<AppointmentResponse[]>(
            reviewKeys.pending(user.id),
            (current) =>
              (current ?? []).filter(
                (candidate) => candidate.id !== appointment.id,
              ),
          );
        }}
      />
    </section>
  );
}

/**
 * The patient's section: someone in one's care in full, and always the
 * reason and the notes. The specialist reading their appointment (M14)
 * sees who attends in full too, as the app's patient header shows them.
 */
function usePatient(appointment: AppointmentSummary, forSpecialist: boolean) {
  const t = useTranslations();
  const { attendee, forDependent } = appointment;
  const inFull = forDependent || forSpecialist;
  const facts: PatientFact[] = [];
  if (inFull) {
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
    name: inFull ? `${attendee.firstName} ${attendee.lastName}` : null,
    facts,
    note: forDependent ? t('appointments.detail.attendeeIsTercero') : undefined,
  };
}

/** The longest wait a browser timer takes (about 24.8 days). */
const maxTimer = 2 ** 31 - 1;

/** Milliseconds until what can be done changes next, or null when nothing will. */
function nextChange(appointment: AppointmentSummary, now: Date): number | null {
  const moments = [appointment.confirmationOpensAt, appointment.startsAt]
    .map((instant) =>
      instant ? new Date(instant).getTime() - now.getTime() : NaN,
    )
    .filter((wait) => Number.isFinite(wait) && wait > 0);
  if (moments.length === 0) return null;
  return Math.min(Math.min(...moments) + 50, maxTimer);
}

/** The page's column: its heading with the state, then the cards. */
export function AppointmentFrame({
  chip,
  children,
  ref,
}: {
  chip?: ReactNode;
  children: ReactNode;
  ref?: React.Ref<HTMLDivElement>;
}) {
  const t = useTranslations('appointments.detail');
  return (
    <div ref={ref} className="flex w-full flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-headline-sm text-text-primary">{t('title')}</h1>
        {chip}
      </div>
      {children}
    </div>
  );
}
