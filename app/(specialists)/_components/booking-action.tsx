'use client';

import Link from 'next/link';

import { routes } from '@/app/lib/routes';

import { Button } from '@/app/ui/button';

import { useBookingOffer } from './use-booking-offer';

type BookingActionProps = {
  /** The profile on screen. */
  specialistId: string;
  /** «Agendar cita», for patients and visitors. */
  bookLabel: string;
  /** «Así ven tu perfil tus pacientes», for the specialist on their own profile. */
  ownNote: string;
  /** The browser carries the panel hint: a specialist's session is likely. */
  expectSpecialist: boolean;
};

/*
 * The profile's main action, the app's «Agendar cita» (M15): a patient or a
 * visitor books (`/book/{id}`, which asks for the session there); a
 * specialist is never offered booking (owner, 2026-10-13): on their own
 * profile — email 17's «Ver mi perfil» — they read that this is how their
 * patients see it, on anyone else's nothing. A browser with the panel hint
 * keeps the button's place until the session is known.
 */
export function BookingAction({
  specialistId,
  bookLabel,
  ownNote,
  expectSpecialist,
}: BookingActionProps) {
  const offer = useBookingOffer(specialistId, expectSpecialist);

  if (offer === 'own') {
    return (
      <p className="animate-fade-in text-center text-body-xxs text-text-secondary">
        {ownNote}
      </p>
    );
  }
  if (offer === 'none') return null;
  if (offer === 'wait') {
    return <span aria-hidden="true" className="block h-control-lg w-full" />;
  }
  return (
    <Button asChild block className="animate-fade-in sm:w-auto sm:min-w-56">
      <Link href={routes.book(specialistId)} rel="nofollow">
        {bookLabel}
      </Link>
    </Button>
  );
}
