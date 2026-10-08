import LocationOn from '@material-symbols/svg-400/rounded/location_on.svg?svgr';
import Stethoscope from '@material-symbols/svg-400/rounded/stethoscope.svg?svgr';
import VerifiedFill from '@material-symbols/svg-400/rounded/verified-fill.svg?svgr';
import { useFormatter, useTranslations } from 'next-intl';

import { sizedPhotoUrl } from '@/app/lib/photos';
import type { SpecialistProfile } from '@/app/lib/schemas/specialists';

import { Avatar } from '@/app/ui/avatar';
import { Icon } from '@/app/ui/icons';
import { StarsRating } from '@/app/ui/stars-rating';

/** The id of the offices section, where the header's offices line leads. */
export const OFFICES_ANCHOR = 'consultorios';

/*
 * The top of the profile, as the app's header: photo, name with the verified
 * badge, the first specialty and office («y N más»), and the rating. Colors
 * follow the app except where white on its green or its lighter blue text
 * would fall under WCAG AA: the pill uses green-700, the counts blue-100.
 */
export function ProfileHero({ profile }: { profile: SpecialistProfile }) {
  const t = useTranslations();
  const format = useFormatter();
  const [firstSpecialty, ...otherSpecialties] = profile.specialties;
  const [firstOffice, ...otherOffices] = profile.offices;
  const { average, count } = profile.rating;
  const averageText =
    average === null
      ? null
      : format.number(average, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        });

  return (
    <section
      aria-labelledby="specialist-name"
      className="flex flex-col items-center rounded-b-2xl bg-primary px-gutter pt-2 pb-8 text-center text-on-primary"
    >
      <Avatar
        name={profile.name}
        // 4x the 110 px avatar: sharp on 3x screens.
        src={profile.photoUrl && sizedPhotoUrl(profile.photoUrl, 440)}
        size="2xl"
        preload
        className="ring-4 ring-white-50/25"
      />
      <div className="mt-4 flex max-w-full items-center justify-center gap-1">
        <h1
          id="specialist-name"
          className="truncate text-headline-sm font-bold"
        >
          {profile.name}
        </h1>
        {profile.verified ? (
          <Icon
            icon={VerifiedFill}
            size={18}
            label={t('search.verifiedSpecialist')}
            className="text-verified-100"
          />
        ) : null}
      </div>
      <div className="mt-2 flex max-w-full flex-col items-center gap-1">
        {firstSpecialty ? (
          <p className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-green-700 px-2.5 py-1 text-body-xs font-medium text-pure-white">
            <Icon icon={Stethoscope} size={16} />
            <span className="truncate">
              {firstSpecialty.name}
              {otherSpecialties.length > 0
                ? ` ${t('search.specialtiesCount', { count: otherSpecialties.length })}`
                : null}
            </span>
          </p>
        ) : null}
        {firstOffice ? (
          <a
            href={`#${OFFICES_ANCHOR}`}
            className="inline-flex min-h-touch max-w-full items-center gap-1 rounded-sm text-body-xxs font-medium text-blue-100 underline underline-offset-2 outline-none focus-visible:ring-3 focus-visible:ring-white-50/70"
          >
            <Icon icon={LocationOn} size={16} />
            <span className="truncate">
              {firstOffice.name}
              {otherOffices.length > 0
                ? ` ${t('search.officesCount', { count: otherOffices.length })}`
                : null}
            </span>
          </a>
        ) : null}
        {count > 0 && averageText !== null && average !== null ? (
          <p className="flex items-center gap-1">
            <StarsRating
              value={average}
              label={t('specialists.starsLabel', { rating: averageText })}
            />
            <span aria-hidden="true" className="text-body-xxxs font-semibold">
              {averageText}
            </span>
            <span className="text-body-xxxs text-blue-100">
              ({count} {count === 1 ? t('rating.review') : t('rating.reviews')})
            </span>
          </p>
        ) : profile.verified ? (
          <p className="mt-1 rounded-full bg-blue-50 px-3 py-1 text-body-xxxs font-semibold text-primary">
            {t('search.verifiedSpecialist')}
          </p>
        ) : null}
      </div>
    </section>
  );
}
