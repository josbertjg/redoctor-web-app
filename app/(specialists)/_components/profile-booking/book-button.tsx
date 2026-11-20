'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@/app/lib/utils';

import { Button } from '@/app/ui/button';

import { useProfileBooking } from './profile-booking';

/*
 * The profile's «Agendar cita» (the header's, and the phone's bar): the
 * booking's modal, at the first step not done yet — the day and hour when
 * none was chosen in the panel, which a phone never shows. A specialist is
 * never offered booking (AGENTS.md §1): on their own profile it says how
 * their patients see it; a browser with the panel hint keeps its place
 * until the session is known.
 */
export function BookButton({ className }: { className?: string }) {
  const t = useTranslations();
  const booking = useProfileBooking();

  if (booking.offer === 'own') {
    return (
      <p
        className={cn(
          'flex animate-fade-in items-center justify-center text-center text-body-xxs text-text-secondary',
          className,
        )}
      >
        {t('specialists.ownProfileNote')}
      </p>
    );
  }
  if (booking.offer === 'none') return null;
  if (booking.offer === 'wait') {
    return (
      <span aria-hidden="true" className={cn('block h-control', className)} />
    );
  }
  return (
    <Button
      shape="soft"
      className={cn('animate-fade-in', className)}
      onClick={() => {
        booking.openDialog();
      }}
    >
      {t('search.bookAppointment')}
    </Button>
  );
}
