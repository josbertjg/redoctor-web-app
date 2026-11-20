'use client';

import { useId, useState } from 'react';

import { useTranslations } from 'next-intl';

import { ForSpecialists, OwnPreview } from '@/app/ui/booking/booking-notices';
import { Button } from '@/app/ui/button';
import { FieldError } from '@/app/ui/field-error';
import { Skeleton } from '@/app/ui/skeleton';

import { useSession } from '@/app/hooks/use-session';

import { BookingPicker } from './booking-picker';
import { useProfileBooking } from './profile-booking';

/*
 * «Agendar cita» beside the profile, from laptops up (Figma, 2026-11-16):
 * the office, the day and the hour, then «Agendar» — the owner's addition
 * to the frames —, which opens the modal at the patient. Never disabled
 * (AGENTS.md §8.3): without an hour it says to choose one. A specialist
 * never books (§1): on their own profile, how their patients see it.
 */
export function BookingPanel({ titleId }: { titleId: string }) {
  const t = useTranslations();
  const booking = useProfileBooking();
  const session = useSession();
  const problemId = useId();
  const [problem, setProblem] = useState<string | null>(null);
  // Said until an hour is chosen, then gone.
  const shownProblem = booking.time === null ? problem : null;

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-8 rounded-xl bg-pure-white p-8"
    >
      <h2 id={titleId} className="text-subtitle-l font-medium text-pure-black">
        {t('search.bookAppointment')}
      </h2>
      {booking.offer === 'own' ? (
        <OwnPreview {...booking.ownerNotice} />
      ) : booking.offer === 'none' ? (
        <ForSpecialists
          onSwitchAccount={() => {
            void session.signOut();
          }}
        />
      ) : booking.offer === 'wait' ? (
        <Skeleton aria-hidden="true" className="h-96 w-full rounded-lg" />
      ) : (
        <>
          <BookingPicker />
          <div className="flex flex-col gap-2">
            <FieldError
              id={problemId}
              message={shownProblem ?? undefined}
              className="text-center"
            />
            <Button
              block
              shape="soft"
              aria-describedby={shownProblem === null ? undefined : problemId}
              onClick={() => {
                if (booking.day === null || booking.time === null) {
                  setProblem(t('search.selectASlot'));
                  return;
                }
                setProblem(null);
                booking.openDialog('patient');
              }}
            >
              {t('book')}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
