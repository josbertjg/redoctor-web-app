'use client';

import Link from 'next/link';

import EditCalendar from '@material-symbols/svg-400/rounded/edit_calendar.svg?svgr';

import { routes } from '@/app/lib/routes';

import { Icon } from '@/app/ui/icons';

import { useBookingOffer } from './use-booking-offer';

/**
 * The app's «Agendar en este consultorio» on an office of the profile: the
 * booking with that office chosen, which opens on its days and hours. Only
 * where booking is offered (`useBookingOffer`).
 */
export function BookAtOffice({
  specialistId,
  officeId,
  label,
  expectSpecialist,
}: {
  specialistId: string;
  officeId: string;
  label: string;
  expectSpecialist: boolean;
}) {
  const offer = useBookingOffer(specialistId, expectSpecialist);
  if (offer !== 'book') return null;

  return (
    <Link
      href={routes.book(specialistId, officeId)}
      rel="nofollow"
      className="inline-flex min-h-touch animate-fade-in items-center gap-1.5 self-start rounded-sm text-label-lg text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Icon icon={EditCalendar} size={18} />
      {label}
    </Link>
  );
}
