'use client';

import { canUseSpecialistArea } from '@/app/lib/auth/account';

import { useSession } from '@/app/hooks/use-session';

type BookingNoteProps = {
  /** The profile on screen. */
  specialistId: string;
  /** «Pronto podrás agendar aquí…», for patients and visitors. */
  patientNote: string;
  /** «Así ven tu perfil tus pacientes», for the specialist on their own profile. */
  ownNote: string;
  /** The browser carries the panel hint: a specialist's session is likely. */
  expectSpecialist: boolean;
};

const noteClass = 'min-h-4 text-center text-body-xxs text-text-secondary';

/*
 * The line over the profile's «Abrir en la app». A patient or a visitor
 * reads that booking is coming; a specialist is never offered booking
 * (owner, 2026-10-13): on their own profile — email 17's «Ver mi perfil» —
 * they read that this is how their patients see it, on anyone else's
 * nothing. A browser with the panel hint waits for the session instead of
 * showing the patients' line first.
 */
export function BookingNote({
  specialistId,
  patientNote,
  ownNote,
  expectSpecialist,
}: BookingNoteProps) {
  const { status, account } = useSession();

  if (account !== null && canUseSpecialistArea(account)) {
    return account.specialist.id === specialistId ? (
      <p className={`${noteClass} animate-fade-in`}>{ownNote}</p>
    ) : null;
  }
  const waiting =
    status === 'resolving' || (status === 'signed-in' && account === null);
  if (expectSpecialist && waiting) {
    return <p aria-hidden="true" className={noteClass} />;
  }
  return <p className={noteClass}>{patientNote}</p>;
}
