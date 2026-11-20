'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { track } from '@/app/lib/analytics/track';
import { failureMessageKey, isApiError } from '@/app/lib/api/errors';
import type { TokenHolder } from '@/app/lib/api/types';
import { appointmentKeys } from '@/app/lib/queries/appointments';
import {
  bookAppointment,
  bookingKeys,
  isInactiveSpecialist,
} from '@/app/lib/queries/booking';
import { publicAgendaKeys } from '@/app/lib/queries/public-availability';
import type { AppointmentResponse } from '@/app/lib/schemas/appointments';
import type { BookingRequest } from '@/app/lib/schemas/booking';

import { wipeScreen } from '@/app/ui/motion/screen-wipe';

type BookingOutcomes = {
  /** Booked: «¡Todo listo!» goes on screen under the green wipe. */
  onBooked: (appointment: AppointmentResponse) => void;
  /** The hour was taken meanwhile (ERR_4002): another one to choose. */
  onSlotTaken: (request: BookingRequest) => void;
  /** The patient's sign-up is not finished (403 ERR_2010). */
  onSignUpNeeded: (request: BookingRequest) => void;
  /** What to say where the booking failed; null when the global notice says it. */
  onFailure: (message: string | null) => void;
};

/**
 * The booking's write (M15), wherever a patient books — `/book/{id}` and
 * the public profile's modal: `POST /scheduling/appointments` through the
 * write-once guard (`bookAppointment`), then what it changed read again —
 * the appointment, the patient's list, the office's days and hours in both
 * agendas, the people in their care when someone new was booked —, the
 * funnel told, and «¡Todo listo!» under the green wipe (AGENTS.md §8.13).
 * A specialist who stopped being active is the caller's to read from the
 * mutation's error.
 */
export function useBookAppointment(
  /** The patient's session; none yet (the modal before a sign-in) books nothing. */
  user: TokenHolder | null,
  outcomes: BookingOutcomes,
) {
  const t = useTranslations();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: BookingRequest) => {
      if (user === null) throw new Error('A booking needs the session');
      return bookAppointment(user, request);
    },
    onSuccess: (appointment, request) => {
      if (user === null) return;
      queryClient.setQueryData(
        appointmentKeys.detail(user.id, appointment.id),
        { kind: 'found', appointment },
      );
      void queryClient.invalidateQueries({
        queryKey: appointmentKeys.list(user.id),
      });
      // The hour is no longer free: the office's days and hours, read again.
      void queryClient.invalidateQueries({
        queryKey: ['office', request.officeId],
      });
      void queryClient.invalidateQueries({ queryKey: publicAgendaKeys.all });
      if (request.attendee.kind === 'new') {
        void queryClient.invalidateQueries({
          queryKey: bookingKeys.terceros(user.id),
        });
      }
      track('web_appointment_booked', {
        relationship: request.attendee.kind === 'self' ? 'self' : 'dependent',
      });
      // A big moment: «¡Todo listo!» arrives under the green wipe. «Agendar»
      // stays busy until then (`isSuccess`): back to its words, it would
      // flash where the colour starts growing.
      void wipeScreen({
        tone: 'success',
        whileCovered: () => {
          outcomes.onBooked(appointment);
        },
      });
    },
    onError: (error, request) => {
      if (isApiError(error) && error.code === 'ERR_4002') {
        // Taken meanwhile: the day read again, another hour to choose.
        void queryClient.invalidateQueries({
          queryKey: appointmentKeys.slots(request.officeId, request.date),
        });
        void queryClient.invalidateQueries({
          queryKey: appointmentKeys.availableDays(
            request.officeId,
            request.date.slice(0, 7),
          ),
        });
        void queryClient.invalidateQueries({
          queryKey: publicAgendaKeys.slots(request.officeId, request.date),
        });
        outcomes.onSlotTaken(request);
        return;
      }
      if (
        isApiError(error) &&
        error.status === 403 &&
        error.code === 'ERR_2010'
      ) {
        outcomes.onSignUpNeeded(request);
        return;
      }
      // A specialist who stopped being active: the page says so.
      if (isInactiveSpecialist(error)) return;
      const failure = failureMessageKey(error, 'appointments.book.failed');
      outcomes.onFailure(failure ? t(failure) : null);
    },
  });
}
