import VerifiedFill from '@material-symbols/svg-400/rounded/verified-fill.svg?svgr';
import { useTranslations } from 'next-intl';

import { Avatar } from '@/app/ui/avatar';
import { Icon } from '@/app/ui/icons';

import type { BookingSpecialist } from './booking-types';

/** Who the appointment is with, at the top of every step: the app's summary opens with it. */
export function BookingSpecialistCard({
  specialist,
}: {
  specialist: BookingSpecialist;
}) {
  const t = useTranslations();

  return (
    <section
      aria-label={t('specialist')}
      className="flex items-center gap-3 rounded-2xl bg-pure-white p-4 shadow-md"
    >
      <Avatar
        name={specialist.name}
        src={specialist.photoUrl}
        size="lg"
        decorative
      />
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="flex items-center gap-1">
          <span className="text-title-md wrap-break-word text-text-primary">
            {specialist.name}
          </span>
          {specialist.verified ? (
            <Icon
              icon={VerifiedFill}
              size={18}
              label={t('search.verifiedSpecialist')}
              className="shrink-0 text-verified"
            />
          ) : null}
        </p>
        {specialist.specialties.length > 0 ? (
          <p className="text-body-sm text-text-secondary">
            {specialist.specialties.join(', ')}
          </p>
        ) : null}
      </div>
    </section>
  );
}
