'use client';

import { useId, useState, type ReactNode } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { track } from '@/app/lib/analytics/track';
import { failureMessageKey, isApiError } from '@/app/lib/api/errors';
import type { SessionUser } from '@/app/lib/firebase/client';
import { todayInCaracas } from '@/app/lib/format/date-of-birth';
import { appointmentKeys } from '@/app/lib/queries/appointments';
import {
  bookAppointment,
  bookingKeys,
  isInactiveSpecialist,
  officeServicesQueryOptions,
} from '@/app/lib/queries/booking';
import { isCalendarDay } from '@/app/lib/reports/period';
import { routes } from '@/app/lib/routes';
import type { AppointmentResponse } from '@/app/lib/schemas/appointments';
import type { BookingRequest } from '@/app/lib/schemas/booking';
import { cn } from '@/app/lib/utils';

import { Button } from '@/app/ui/button';
import { FieldError } from '@/app/ui/field-error';
import { BottomActions } from '@/app/ui/layout/bottom-actions';

import { useFocusHeading } from '@/app/hooks/use-focus-heading';

import { BookingDone } from './booking-done';
import { BookingFrame } from './booking-frame';
import { BookingUnavailable } from './booking-notices';
import {
  bookingSteps,
  emptyPatientValues,
  type BookingSpecialist,
  type BookingStep,
  type PatientChoice,
  type PatientValues,
} from './booking-types';
import { OfficeStep } from './office-step';
import { patientFormId, PatientStep } from './patient-step';
import { SlotStep } from './slot-step';
import { SummaryStep } from './summary-step';
import { useFirstFreeDay } from './use-first-free-day';

const stepOrder: Record<BookingStep, number> = {
  office: 0,
  slot: 1,
  patient: 2,
  summary: 3,
};

const isStep = (value: string | null): value is BookingStep =>
  value !== null && (bookingSteps as readonly string[]).includes(value);

type BookingStepsProps = {
  /** The page's top: the way back, the title, the specialist. */
  header: ReactNode;
  specialist: BookingSpecialist;
  specialtyId: string;
  user: SessionUser;
  /** The account the appointment will be saved under (AGENTS.md §1). */
  savedUnder: string | null;
};

/*
 * The app's booking sheet as a page, its four steps — the office (skipped
 * with only one), the day and hour, the patient, the summary — and then
 * «¡Todo listo!». The step lives in the address (`?step=`), so the browser's
 * back goes to the step before, and a step the choices do not reach yet
 * falls back to the furthest one they do (a reload starts that step again).
 * What a step chose survives going back and forth; the reason and the
 * person never travel in the address (AGENTS.md §11).
 */
export function BookingSteps({
  header,
  specialist,
  specialtyId,
  user,
  savedUnder,
}: BookingStepsProps) {
  const t = useTranslations();
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const problemId = useId();
  const [today] = useState(() => todayInCaracas());

  const { offices } = specialist;
  const steps: readonly BookingStep[] =
    offices.length > 1 ? bookingSteps : bookingSteps.slice(1);
  const namedOffice = offices.find(
    (office) => office.id === searchParams.get('office'),
  );
  // A day the search's results named (M16): the step opens on it.
  const namedDay = searchParams.get('date');

  const [officeId, setOfficeId] = useState(
    () => namedOffice?.id ?? offices[0]?.id ?? '',
  );
  // The office the profile named («Agendar en este consultorio») opens on
  // the day and hour, as in the app.
  const [startStep] = useState<BookingStep>(() =>
    namedOffice !== undefined && offices.length > 1
      ? 'slot'
      : (steps[0] ?? 'slot'),
  );
  /** The day the person chose, or the one named; until then, the first free one. */
  const [chosenDay, setChosenDay] = useState<string | null>(() =>
    namedDay !== null && isCalendarDay(namedDay) && namedDay >= today
      ? namedDay
      : null,
  );
  const [shownMonth, setShownMonth] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [slotTaken, setSlotTaken] = useState(false);
  const [patientValues, setPatientValues] =
    useState<PatientValues>(emptyPatientValues);
  const [patient, setPatient] = useState<PatientChoice | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [booked, setBooked] = useState<AppointmentResponse | null>(null);

  const suggestedDay = useFirstFreeDay(user, officeId, today);
  const day = chosenDay ?? suggestedDay;
  const month = shownMonth ?? (day ?? today).slice(0, 7);
  const services = useQuery(officeServicesQueryOptions(user, officeId));
  const office =
    offices.find((candidate) => candidate.id === officeId) ?? offices[0];

  const asked = searchParams.get('step');
  const requested = isStep(asked) ? asked : startStep;
  const furthest: BookingStep =
    day === null || time === null
      ? 'slot'
      : patient === null
        ? 'patient'
        : 'summary';
  let step = stepOrder[requested] <= stepOrder[furthest] ? requested : furthest;
  if (!steps.includes(step)) step = steps[0] ?? 'slot';
  const position = steps.indexOf(step);
  const previous = position > 0 ? steps[position - 1] : undefined;

  const container = useFocusHeading(booked === null ? step : 'booked');

  const goTo = (next: BookingStep) => {
    setProblem(null);
    const params = new URLSearchParams(window.location.search);
    params.set('step', next);
    params.set('office', officeId);
    window.history.pushState(null, '', `?${params.toString()}`);
  };

  const book = useMutation({
    mutationFn: (request: BookingRequest) => bookAppointment(user, request),
    onSuccess: (appointment, request) => {
      queryClient.setQueryData(
        appointmentKeys.detail(user.id, appointment.id),
        {
          kind: 'found',
          appointment,
        },
      );
      void queryClient.invalidateQueries({
        queryKey: appointmentKeys.list(user.id),
      });
      // The slot is no longer free: the office's days and hours, read again.
      void queryClient.invalidateQueries({
        queryKey: ['office', request.officeId],
      });
      if (request.attendee.kind === 'new') {
        void queryClient.invalidateQueries({
          queryKey: bookingKeys.terceros(user.id),
        });
      }
      track('web_appointment_booked', {
        relationship: request.attendee.kind === 'self' ? 'self' : 'dependent',
      });
      setBooked(appointment);
    },
    onError: (error, request) => {
      if (isApiError(error) && error.code === 'ERR_4002') {
        // Taken meanwhile: the day read again, another hour to choose.
        setTime(null);
        setSlotTaken(true);
        void queryClient.invalidateQueries({
          queryKey: appointmentKeys.slots(request.officeId, request.date),
        });
        void queryClient.invalidateQueries({
          queryKey: appointmentKeys.availableDays(
            request.officeId,
            request.date.slice(0, 7),
          ),
        });
        goTo('slot');
        return;
      }
      if (
        isApiError(error) &&
        error.status === 403 &&
        error.code === 'ERR_2010'
      ) {
        router.push(
          routes.signUp(
            routes.book(specialist.id, officeId, namedDay ?? undefined),
          ),
        );
        return;
      }
      // A specialist who stopped being active: the page says so.
      if (isInactiveSpecialist(error)) return;
      const failure = failureMessageKey(error, 'appointments.book.failed');
      setProblem(failure ? t(failure) : null);
    },
  });

  if (booked !== null) {
    return (
      <BookingFrame header={header}>
        <div ref={container}>
          <BookingDone appointment={booked} specialistName={specialist.name} />
        </div>
      </BookingFrame>
    );
  }

  if (
    office === undefined ||
    isInactiveSpecialist(services.error) ||
    isInactiveSpecialist(book.error)
  ) {
    return (
      <BookingFrame header={header}>
        <div ref={container}>
          <BookingUnavailable reason="inactive" />
        </div>
      </BookingFrame>
    );
  }

  const changeOffice = (next: string) => {
    if (next === officeId) return;
    setOfficeId(next);
    setChosenDay(null);
    setShownMonth(null);
    setTime(null);
    setSlotTaken(false);
    // The reason belongs to the office: chosen again, whoever it is for.
    setPatient(null);
    setPatientValues((values) => ({ ...values, reasonId: '' }));
  };

  const advance = () => {
    if (step === 'slot' && (day === null || time === null)) {
      setProblem(t('search.selectASlot'));
      return;
    }
    if (step === 'slot') setChosenDay(day);
    goTo(step === 'office' ? 'slot' : 'patient');
  };

  const submit = () => {
    if (book.isPending || day === null || time === null || patient === null) {
      return;
    }
    setProblem(null);
    book.mutate({
      specialistId: specialist.id,
      officeId,
      date: day,
      startTime: time,
      specialtyId,
      consultationReasonId: patient.reasonId,
      attendee: patient.attendee,
    });
  };

  const titles: Record<BookingStep, string> = {
    office: t('search.selectOffice'),
    slot: t('dateAndTime'),
    patient: t('patient'),
    summary: t('search.confirm.title'),
  };

  const actions = (
    <BottomActions width="narrow">
      {/* Always mounted: a problem is read aloud as it appears. */}
      <FieldError
        id={problemId}
        message={problem ?? undefined}
        className="text-center"
      />
      <div className="flex w-full gap-3">
        {previous ? (
          <Button
            variant="white"
            shape="soft"
            className="flex-1"
            onClick={() => {
              goTo(previous);
            }}
          >
            {t('back')}
          </Button>
        ) : null}
        {step === 'patient' ? (
          <Button
            type="submit"
            form={patientFormId}
            shape="soft"
            className="flex-1"
          >
            {t('next')}
          </Button>
        ) : step === 'summary' ? (
          <Button
            shape="soft"
            className="flex-1"
            loading={book.isPending}
            aria-describedby={problem === null ? undefined : problemId}
            onClick={submit}
          >
            {t('book')}
          </Button>
        ) : (
          <Button shape="soft" className="flex-1" onClick={advance}>
            {t('next')}
          </Button>
        )}
      </div>
    </BottomActions>
  );

  return (
    <BookingFrame header={header} actions={actions}>
      <div ref={container} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <p className="text-label-md text-text-secondary">
            {t('appointments.book.step', {
              current: position + 1,
              total: steps.length,
            })}
          </p>
          <div aria-hidden="true" className="flex gap-1">
            {steps.map((name, index) => (
              <span
                key={name}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors duration-base ease-house',
                  index <= position ? 'bg-primary' : 'bg-grey-200',
                )}
              />
            ))}
          </div>
          <h2 className="mt-1 text-title-lg text-text-primary">
            {titles[step]}
          </h2>
          {step === 'summary' ? (
            <p className="text-body-md text-text-secondary">
              {t('search.confirm.description')}
            </p>
          ) : null}
        </div>

        {step === 'office' ? (
          <OfficeStep
            offices={offices}
            officeId={officeId}
            onOfficeChange={changeOffice}
          />
        ) : step === 'slot' ? (
          <SlotStep
            slotTaken={slotTaken}
            user={user}
            officeId={officeId}
            today={today}
            month={month}
            onMonthChange={setShownMonth}
            day={day}
            onDayChange={(date) => {
              setChosenDay(date);
              setTime(null);
              setProblem(null);
            }}
            time={time}
            onTimeChange={(startTime) => {
              // The hour belongs to the day on screen, chosen or suggested.
              setChosenDay(day);
              setTime(startTime);
              setSlotTaken(false);
              setProblem(null);
            }}
          />
        ) : step === 'patient' ? (
          <PatientStep
            user={user}
            officeId={officeId}
            today={today}
            defaults={patientValues}
            onDone={(choice) => {
              setPatientValues(choice.values);
              setPatient(choice);
              goTo('summary');
            }}
          />
        ) : day !== null && time !== null && patient !== null ? (
          <SummaryStep
            office={office}
            canChangeOffice={offices.length > 1}
            day={day}
            time={time}
            reason={
              services.data?.find((reason) => reason.id === patient.reasonId) ??
              null
            }
            attendee={patient.attendee}
            savedUnder={savedUnder}
            onEdit={goTo}
          />
        ) : null}
      </div>
    </BookingFrame>
  );
}
