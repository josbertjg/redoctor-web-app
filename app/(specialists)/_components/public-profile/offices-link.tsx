'use client';

import { useState } from 'react';

import LocationOn from '@material-symbols/svg-400/rounded/location_on.svg?svgr';
import { useTranslations } from 'next-intl';

import type { SpecialistProfile } from '@/app/lib/schemas/specialists';

import { Icon } from '@/app/ui/icons';
import { Sheet } from '@/app/ui/sheet';

import { OfficeList } from '../office-list';
import { useProfileBooking } from '../profile-booking/profile-booking';

/*
 * The header's first office, «Clínica Razetti y 1 más» (Figma, 2026-11-16):
 * the offices' sheet — each one's address and description, «Cómo llegar»,
 * its prices —, and, where booking is offered, «Agendar en este
 * consultorio», which chooses it in the booking and opens its modal.
 */
export function OfficesLink({
  offices,
  specialistName,
}: {
  offices: SpecialistProfile['offices'];
  specialistName: string;
}) {
  const t = useTranslations();
  const booking = useProfileBooking();
  const [open, setOpen] = useState(false);
  const [first, ...others] = offices;
  if (first === undefined) return null;

  return (
    <>
      <button
        type="button"
        aria-label={t('specialists.officesLink', { name: specialistName })}
        onClick={() => {
          setOpen(true);
        }}
        className="inline-flex min-h-touch max-w-full items-center gap-1.5 self-start rounded-sm text-body-xxs font-medium text-grey-700 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:min-h-0"
      >
        <Icon icon={LocationOn} size={16} className="shrink-0" />
        <span className="truncate text-blue-300 underline underline-offset-2">
          {first.name}
          {others.length > 0
            ? ` ${t('search.officesCount', { count: others.length })}`
            : null}
        </span>
      </button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title={t('search.attentionOffices')}
      >
        <div className="pb-2">
          <OfficeList
            offices={offices}
            {...(booking.offer === 'book'
              ? {
                  onBook: (officeId: string) => {
                    booking.chooseOffice(officeId);
                    setOpen(false);
                    booking.openDialog('slot');
                  },
                }
              : {})}
          />
        </div>
      </Sheet>
    </>
  );
}
