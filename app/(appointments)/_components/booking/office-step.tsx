'use client';

import { useTranslations } from 'next-intl';

import { ChoiceCards } from '@/app/ui/choice-cards';

import type { BookingSpecialist } from './booking-types';

/**
 * The app's first step, «Selecciona un consultorio»: every office the
 * profile publishes, with its address and the specialist's directions.
 * One comes chosen, as in the app (the first, or the one the profile's
 * «Agendar en este consultorio» named).
 */
export function OfficeStep({
  offices,
  officeId,
  onOfficeChange,
}: {
  offices: BookingSpecialist['offices'];
  officeId: string;
  onOfficeChange: (officeId: string) => void;
}) {
  const t = useTranslations('search');

  return (
    <ChoiceCards
      legend={<span className="sr-only">{t('selectOffice')}</span>}
      columns={1}
      value={officeId}
      options={offices.map((office) => ({
        value: office.id,
        label: office.name,
        description: (
          <>
            <span className="block">{office.address}</span>
            {office.description ? (
              <span className="block">{office.description}</span>
            ) : null}
          </>
        ),
      }))}
      inputProps={{
        name: 'office',
        onChange: (event) => {
          onOfficeChange(event.target.value);
        },
      }}
    />
  );
}
