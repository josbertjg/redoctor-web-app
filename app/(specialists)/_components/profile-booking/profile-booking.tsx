'use client';

import { createContext, use, useEffect, useState, type ReactNode } from 'react';

import { useSearchParams } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';

import { todayInCaracas } from '@/app/lib/format/date-of-birth';
import {
  publicDaySlotsQueryOptions,
  specialistFreeDaysQueryOptions,
} from '@/app/lib/queries/public-availability';
import { isCalendarDay } from '@/app/lib/reports/period';

import {
  emptyPatientValues,
  type BookingSpecialist,
  type PatientChoice,
  type PatientValues,
} from '@/app/ui/booking/booking-types';

import { useWideScreen } from '@/app/hooks/use-wide-screen';

import { useBookingOffer, type BookingOffer } from '../use-booking-offer';

/** The modal's steps: the day and hour (when not chosen in the panel), the patient, the summary. */
export type BookingDialogStep = 'slot' | 'patient' | 'summary';

type ProfileBooking = {
  specialist: BookingSpecialist;
  /** The specialty a booking carries when there is no doubt which (REDOC-251). */
  specialtyId: string | null;
  /** The app's preview notice, for the specialist on their own profile. */
  ownerNotice: { title: string; description: string };
  /** What the profile offers whoever looks: booking to a patient or a visitor only. */
  offer: BookingOffer;
  today: string;
  officeId: string;
  /** The day in hand: the one chosen, or the office's first free one; null while unknown. */
  day: string | null;
  /** Candidate days already checked and found to have zero available slots left. */
  exhaustedDays: readonly string[];
  /** The month on screen. */
  month: string;
  time: string | null;
  patientValues: PatientValues;
  patient: PatientChoice | null;
  /** The modal's step; null while closed. */
  dialog: BookingDialogStep | null;
  /** The agenda is read: the panel is on screen, or the modal open. */
  agendaShown: boolean;
  chooseOffice: (officeId: string) => void;
  chooseDay: (date: string) => void;
  showMonth: (month: string) => void;
  chooseTime: (time: string) => void;
  /** The hour was taken meanwhile: another one to choose. */
  forgetTime: () => void;
  takePatient: (choice: PatientChoice) => void;
  /** Opens the modal at a step, or at the first one not done yet. */
  openDialog: (step?: BookingDialogStep) => void;
  goTo: (step: BookingDialogStep) => void;
  closeDialog: () => void;
};

const ProfileBookingContext = createContext<ProfileBooking | null>(null);

export function useProfileBooking(): ProfileBooking {
  const booking = use(ProfileBookingContext);
  if (booking === null) {
    throw new Error('useProfileBooking needs a ProfileBookingProvider above');
  }
  return booking;
}

const timeOfDay = /^\d{2}:\d{2}$/;

type ProfileBookingProviderProps = {
  specialist: BookingSpecialist;
  specialtyId: string | null;
  ownerNotice: { title: string; description: string };
  /** The browser carries the panel hint: a specialist's session is likely. */
  expectSpecialist: boolean;
  children: ReactNode;
};

/*
 * One booking on the public profile (Figma, 2026-11-16), shared by the
 * panel beside it and the modal: the office, the day and the hour chosen in
 * one are the other's, and the patient's answers survive closing the modal.
 * Until a day is chosen, the office's first free one is in hand. A sign-up
 * finished from the modal comes back with the choice in the address
 * (`routes.specialistBooking`): taken in, the address cleaned, the modal
 * open again at the patient.
 */
export function ProfileBookingProvider({
  specialist,
  specialtyId,
  ownerNotice,
  expectSpecialist,
  children,
}: ProfileBookingProviderProps) {
  const searchParams = useSearchParams();
  const offer = useBookingOffer(specialist.id, expectSpecialist);
  const wide = useWideScreen();
  const { offices } = specialist;

  const [today] = useState(() => todayInCaracas());
  // What the address brought back, taken once.
  const [arrival] = useState(() => {
    const office = offices.find(
      (candidate) => candidate.id === searchParams.get('office'),
    );
    const date = searchParams.get('date');
    const time = searchParams.get('time');
    const day =
      office && date !== null && isCalendarDay(date) && date >= today
        ? date
        : null;
    const hour = day !== null && time !== null && timeOfDay.test(time);
    const wantsBook = searchParams.get('book') === '1';
    const openStep: BookingDialogStep | null = wantsBook
      ? hour
        ? 'patient'
        : 'slot'
      : null;
    return {
      officeId: office?.id ?? null,
      day,
      time: hour ? time : null,
      openStep,
    };
  });

  const [officeId, setOfficeId] = useState(
    () => arrival.officeId ?? offices[0]?.id ?? '',
  );
  const [chosenDay, setChosenDay] = useState<string | null>(arrival.day);
  const [shownMonth, setShownMonth] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(arrival.time);
  const [patientValues, setPatientValues] =
    useState<PatientValues>(emptyPatientValues);
  const [patient, setPatient] = useState<PatientChoice | null>(null);
  const [dialog, setDialog] = useState<BookingDialogStep | null>(
    arrival.openStep,
  );
  const [exhaustedState, setExhaustedState] = useState<{
    scope: string;
    days: readonly string[];
  }>({ scope: '', days: [] });

  // The way back from the sign-up is spent: the address goes back to the
  // profile's own, so a reload or a share never opens the modal again.
  useEffect(() => {
    if (arrival.openStep === null && arrival.officeId === null) return;
    const url = new URL(window.location.href);
    for (const name of ['office', 'date', 'time', 'book']) {
      url.searchParams.delete(name);
    }
    window.history.replaceState(window.history.state, '', url);
  }, [arrival]);

  const agendaShown = offer === 'book' && (wide || dialog !== null);
  const firstFree = useQuery({
    ...specialistFreeDaysQueryOptions(specialist.id, today),
    enabled: agendaShown && officeId !== '',
  });
  // The API's availability window lists days that have office hours scheduled,
  // even when all slots on a day are already past or booked: walk candidates
  // until one actually has at least one selectable slot.
  const candidates = firstFree.data?.[officeId] ?? [];
  const exhaustionScope = `${officeId}:${today}`;
  const exhaustedDays =
    exhaustedState.scope === exhaustionScope ? exhaustedState.days : [];
  const candidateDay =
    candidates.find((candidate) => !exhaustedDays.includes(candidate)) ?? null;
  const candidateHours = useQuery({
    ...publicDaySlotsQueryOptions(officeId, candidateDay ?? today),
    enabled: agendaShown && chosenDay === null && candidateDay !== null,
  });
  if (
    chosenDay === null &&
    candidateDay !== null &&
    candidateHours.isSuccess &&
    !candidateHours.data.slots.some((slot) => slot.available) &&
    !exhaustedDays.includes(candidateDay)
  ) {
    setExhaustedState({
      scope: exhaustionScope,
      days: [...exhaustedDays, candidateDay],
    });
  }
  const day = chosenDay ?? candidateDay ?? candidates[0] ?? null;
  const month = shownMonth ?? (day ?? today).slice(0, 7);

  const value: ProfileBooking = {
    specialist,
    specialtyId,
    ownerNotice,
    offer,
    today,
    officeId,
    day,
    exhaustedDays,
    month,
    time,
    patientValues,
    patient,
    dialog,
    agendaShown,
    chooseOffice: (next) => {
      if (next === officeId) return;
      setOfficeId(next);
      setChosenDay(null);
      setShownMonth(null);
      setTime(null);
      // The reason belongs to the office: chosen again, whoever it is for.
      setPatient(null);
      setPatientValues((values) => ({ ...values, reasonId: '' }));
    },
    chooseDay: (date) => {
      setChosenDay(date);
      setTime(null);
    },
    showMonth: setShownMonth,
    chooseTime: (startTime) => {
      // The hour belongs to the day on screen, chosen or suggested.
      setChosenDay(day);
      setTime(startTime);
    },
    forgetTime: () => {
      setTime(null);
    },
    takePatient: (choice) => {
      setPatientValues(choice.values);
      setPatient(choice);
    },
    openDialog: (step) => {
      setDialog(
        step ??
          (time === null ? 'slot' : patient === null ? 'patient' : 'summary'),
      );
    },
    goTo: setDialog,
    closeDialog: () => {
      setDialog(null);
    },
  };

  return (
    <ProfileBookingContext value={value}>{children}</ProfileBookingContext>
  );
}
