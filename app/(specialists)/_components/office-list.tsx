import Directions from '@material-symbols/svg-400/rounded/directions.svg?svgr';
import LocationOn from '@material-symbols/svg-400/rounded/location_on.svg?svgr';
import Signpost from '@material-symbols/svg-400/rounded/signpost.svg?svgr';
import { useTranslations } from 'next-intl';

import { directionsUrl } from '@/app/lib/maps';
import type { SpecialistProfile } from '@/app/lib/schemas/specialists';

import { Icon } from '@/app/ui/icons';

/*
 * The specialist's offices: the app's office card plus what its office sheet
 * shows (the description), and «Cómo llegar» to the exact coordinates in
 * Google Maps, the promise of the app's share message. No static map: that
 * needs a browser key restricted to the web (AGENTS.md §11), not the app's.
 */
export function OfficeList({
  offices,
}: {
  offices: SpecialistProfile['offices'];
}) {
  const t = useTranslations('specialists');

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {offices.map((office) => (
        <li
          key={office.id}
          className="flex flex-col gap-1.5 rounded-lg bg-pure-white px-3 py-2.5 shadow-sm"
        >
          <p className="line-clamp-2 text-body-xxs font-medium text-text-primary">
            {office.name}
          </p>
          <p className="flex items-start gap-1 text-body-xxs font-medium text-text-secondary">
            <Icon icon={LocationOn} size={16} className="mt-0.5" />
            <span>{office.address}</span>
          </p>
          {office.description ? (
            <p className="flex items-start gap-1 text-body-xxs text-text-secondary">
              <Icon icon={Signpost} size={16} className="mt-0.5" />
              <span>{office.description}</span>
            </p>
          ) : null}
          <a
            href={directionsUrl(office.coordinates)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('directionsTo', { office: office.name })}
            className="inline-flex min-h-touch items-center gap-1.5 self-start rounded-sm text-label-lg text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Icon icon={Directions} size={18} />
            {t('directions')}
          </a>
        </li>
      ))}
    </ul>
  );
}
