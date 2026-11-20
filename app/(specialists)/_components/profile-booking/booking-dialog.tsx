'use client';

import { useId, useState, type ReactNode } from 'react';

import type { Route } from 'next';

import { useRouter } from 'next/navigation';

import Login from '@material-symbols/svg-400/rounded/login.svg?svgr';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import type { TokenHolder } from '@/app/lib/api/types';
import {
  canUseSpecialistArea,
  mustFinishPatientSignup,
  needsSignUp,
} from '@/app/lib/auth/account';
import {
  isInactiveSpecialist,
  officeServicesQueryOptions,
} from '@/app/lib/queries/booking';
import { routes } from '@/app/lib/routes';
import type { AppointmentResponse } from '@/app/lib/schemas/appointments';

import { AccountErrorState } from '@/app/ui/auth/account-error-state';
import { SignInButtons } from '@/app/ui/auth/sign-in-buttons';
import { SignInLegalNote } from '@/app/ui/auth/sign-in-legal-note';
import { useSignInArrival } from '@/app/ui/auth/use-sign-in-arrival';
import { BookingDone } from '@/app/ui/booking/booking-done';
import {
  BookingUnavailable,
  FinishSignUpFirst,
  ForSpecialists,
  OwnPreview,
} from '@/app/ui/booking/booking-notices';
import { patientFormId, PatientStep } from '@/app/ui/booking/patient-step';
import { SummaryStep } from '@/app/ui/booking/summary-step';
import { useBookAppointment } from '@/app/ui/booking/use-book-appointment';
import { Button } from '@/app/ui/button';
import { FieldError } from '@/app/ui/field-error';
import { Sheet } from '@/app/ui/sheet';
import { Skeleton } from '@/app/ui/skeleton';
import { StatusCard } from '@/app/ui/status-card';

import { BookingPicker } from './booking-picker';
import { useProfileBooking, type BookingDialogStep } from './profile-booking';

const dialogSteps: readonly BookingDialogStep[] = [
  'slot',
  'patient',
  'summary',
];

/** What a query that waits for the session is built with until there is one. */
const noSession: TokenHolder = {
  id: '',
  getToken: () => Promise.reject(new Error('No session yet')),
};

/*
 * The booking's modal on the public profile (the owner's word, 2026-11-16):
 * what the panel does not hold — the patient and the summary — and, when
 * opened before an hour was chosen (the profile's «Agendar cita», or a
 * phone, where no panel shows), the day and hour too. A centred dialog on a
 * computer, a sheet from the bottom on a phone (`Sheet`), its steps with
 * the sheet's way back. The session is asked for right there, as on `/book`
 * (AGENTS.md §1): a stranger signs in without leaving it, a patient whose
 * sign-up is not finished goes to finish it and comes back to the modal
 * with the choice kept. Then «Agendar», and «¡Todo listo!» under the green
 * wipe. Closing it keeps what was chosen for the next time; after a
 * booking, the next one starts clean.
 */
export function BookingDialog() {
  const t = useTranslations();
  const router = useRouter();
  const booking = useProfileBooking();
  const { specialist, officeId, day, time, patient, dialog } = booking;
  const office =
    specialist.offices.find((candidate) => candidate.id === officeId) ??
    specialist.offices[0];
  const { session, onSignedIn } = useSignInArrival();
  const { account, user } = session;
  const problemId = useId();
  const [problem, setProblem] = useState<string | null>(null);
  const [slotTaken, setSlotTaken] = useState(false);
  const [booked, setBooked] = useState<AppointmentResponse | null>(null);

  const step = dialog ?? 'slot';
  const goTo = (next: BookingDialogStep) => {
    setProblem(null);
    booking.goTo(next);
  };

  const services = useQuery({
    ...officeServicesQueryOptions(
      user ?? noSession,
      officeId,
      office?.reasons ?? null,
    ),
    enabled: user !== null && step === 'summary',
  });

  const book = useBookAppointment(user, {
    onBooked: setBooked,
    onSlotTaken: () => {
      booking.forgetTime();
      setSlotTaken(true);
      goTo('slot');
    },
    onSignUpNeeded: (request) => {
      router.push(
        routes.signUp(
          routes.specialistBooking(specialist.id, {
            officeId: request.officeId,
            date: request.date,
            time: request.startTime,
          }),
        ),
      );
    },
    onFailure: setProblem,
  });

  const close = () => {
    if (book.isPending) return;
    booking.closeDialog();
    if (booked !== null) {
      // A new booking starts clean: the hour is no longer free.
      setBooked(null);
      booking.forgetTime();
    }
    setProblem(null);
    setSlotTaken(false);
  };

  const position = dialogSteps.indexOf(step);
  const back =
    booked === null && position > 0 ? dialogSteps[position - 1] : undefined;

  const view = ((): {
    title: string;
    body: ReactNode;
    footer?: ReactNode;
  } => {
    if (booked !== null) {
      return {
        title: t('search.bookAppointment'),
        body: (
          <BookingDone
            appointment={booked}
            specialistName={specialist.name}
            className="p-0 shadow-none sm:p-0"
          />
        ),
      };
    }
    if (
      office === undefined ||
      isInactiveSpecialist(services.error) ||
      isInactiveSpecialist(book.error)
    ) {
      return {
        title: t('search.bookAppointment'),
        body: <BookingUnavailable reason="inactive" />,
      };
    }
    if (step === 'slot') {
      return {
        title: t('dateAndTime'),
        body: (
          <div className="flex flex-col gap-5">
            {slotTaken ? (
              <div
                role="alert"
                className="flex animate-fade-in flex-col gap-1 rounded-xl bg-warning-light px-4 py-3 text-body-sm text-warning-800"
              >
                <p className="font-semibold">{t('search.slotTakenTitle')}</p>
                <p>{t('search.slotTakenDescription')}</p>
              </div>
            ) : null}
            <BookingPicker />
          </div>
        ),
        footer: (
          // Each step's own button (`key`): reused for the next step, the
          // tap on this one would land on the patient's submit and send its
          // form — straight to the summary, the patient unseen.
          <Button
            key="slot-next"
            block
            shape="soft"
            aria-describedby={problem === null ? undefined : problemId}
            onClick={() => {
              if (day === null || time === null) {
                setProblem(t('search.selectASlot'));
                return;
              }
              setSlotTaken(false);
              goTo('patient');
            }}
          >
            {t('next')}
          </Button>
        ),
      };
    }

    // The patient and the summary need the patient's session.
    if (session.status === 'signed-out') {
      return {
        // The card under it says what to do; the sheet keeps the booking's name.
        title: t('search.bookAppointment'),
        body: (
          <StatusCard
            icon={Login}
            title={t('appointments.book.signIn')}
            description={t('search.noAuthDescription')}
            className="shadow-none"
          >
            <SignInButtons onSignedIn={onSignedIn} />
            <SignInLegalNote />
          </StatusCard>
        ),
      };
    }
    if (session.accountStatus === 'error') {
      return {
        title: t('search.bookAppointment'),
        body: <AccountErrorState canSwitchAccount />,
      };
    }
    if (session.status === 'resolving' || user === null || account === null) {
      return {
        title: t('search.bookAppointment'),
        body: (
          <div aria-busy="true" className="flex flex-col gap-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ),
      };
    }
    if (canUseSpecialistArea(account)) {
      return {
        title: t('search.bookAppointment'),
        body:
          account.specialist.id === specialist.id ? (
            <OwnPreview {...booking.ownerNotice} />
          ) : (
            <ForSpecialists
              onSwitchAccount={() => {
                void session.signOut();
              }}
            />
          ),
      };
    }
    if (day === null || time === null) {
      // The hour went (taken, or a change elsewhere): back to choosing one.
      return {
        title: t('dateAndTime'),
        body: <BookingPicker />,
      };
    }
    if (needsSignUp(account) || mustFinishPatientSignup(account)) {
      return {
        title: t('search.bookAppointment'),
        body: (
          <FinishSignUpFirst
            specialistName={specialist.name}
            signUpHref={routes.signUp(
              routes.specialistBooking(specialist.id, {
                officeId,
                date: day,
                time,
              }),
            )}
            profileHref={routes.specialist(specialist.id) as Route}
          />
        ),
      };
    }
    if (step === 'patient' || patient === null) {
      return {
        title: t('patient'),
        body: (
          <PatientStep
            user={user}
            officeId={officeId}
            knownReasons={office.reasons}
            today={booking.today}
            defaults={booking.patientValues}
            onDone={(choice) => {
              booking.takePatient(choice);
              goTo('summary');
            }}
          />
        ),
        footer: (
          <Button
            key="patient-next"
            type="submit"
            form={patientFormId}
            block
            shape="soft"
          >
            {t('next')}
          </Button>
        ),
      };
    }
    return {
      title: t('search.confirm.title'),
      body: (
        <div className="flex flex-col gap-4">
          <p className="text-body-md text-text-secondary">
            {t('search.confirm.description')}
          </p>
          <SummaryStep
            office={office}
            canChangeOffice={specialist.offices.length > 1}
            day={day}
            time={time}
            reason={
              services.data?.find((reason) => reason.id === patient.reasonId) ??
              null
            }
            attendee={patient.attendee}
            savedUnder={user.email ?? account.email}
            onEdit={(edit) => {
              goTo(edit === 'patient' ? 'patient' : 'slot');
            }}
          />
        </div>
      ),
      footer: (
        <Button
          key="summary-book"
          block
          shape="soft"
          loading={book.isPending || book.isSuccess}
          aria-describedby={problem === null ? undefined : problemId}
          onClick={() => {
            if (book.isPending) return;
            setProblem(null);
            book.mutate({
              specialistId: specialist.id,
              officeId,
              date: day,
              startTime: time,
              specialtyId: booking.specialtyId,
              consultationReasonId: patient.reasonId,
              attendee: patient.attendee,
            });
          }}
        >
          {t('book')}
        </Button>
      ),
    };
  })();

  return (
    <Sheet
      open={dialog !== null || booked !== null}
      onOpenChange={(open) => {
        if (!open) close();
      }}
      title={view.title}
      description={
        booked === null && view.footer
          ? t('appointments.book.step', {
              current: position + 1,
              total: dialogSteps.length,
            })
          : undefined
      }
      onBack={
        back
          ? () => {
              goTo(back);
            }
          : undefined
      }
      footer={
        view.footer ? (
          <div className="flex flex-col gap-2">
            {/* Always mounted: a problem is read aloud as it appears. */}
            <FieldError
              id={problemId}
              message={problem ?? undefined}
              className="text-center"
            />
            {view.footer}
          </div>
        ) : undefined
      }
      className="sm:max-w-lg"
    >
      {view.body}
    </Sheet>
  );
}
