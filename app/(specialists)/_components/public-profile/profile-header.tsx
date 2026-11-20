import Stethoscope from '@material-symbols/svg-400/rounded/stethoscope.svg?svgr';
import VerifiedFill from '@material-symbols/svg-400/rounded/verified-fill.svg?svgr';
import { useFormatter, useTranslations } from 'next-intl';

import { routes } from '@/app/lib/routes';
import type { SpecialistProfile } from '@/app/lib/schemas/specialists';
import { absoluteUrl } from '@/app/lib/site';

import { Avatar } from '@/app/ui/avatar';
import { Icon } from '@/app/ui/icons';
import {
  sharedNames,
  SharedTransition,
} from '@/app/ui/motion/view-transitions';
import { StarsRating } from '@/app/ui/stars-rating';

import { FavoriteButton } from '../favorite-button';
import { BookButton } from '../profile-booking/book-button';
import { ShareLinkButton } from '../share-link-button';
import { OfficesLink } from './offices-link';

/*
 * The public profile's header card (Figma, 2026-11-16): the photo, the name
 * with the verified mark, the first specialty as the brand's green pill
 * («y N más» after it), the first office (its sheet), the stars, the heart
 * at the top right, then «Agendar cita» and «Compartir». The tabs close the
 * card (profile-tabs.tsx). The photo and the name arrive from the search's
 * card (AGENTS.md §8.13).
 */
export function ProfileHeader({ profile }: { profile: SpecialistProfile }) {
  const t = useTranslations();
  const format = useFormatter();
  const [firstSpecialty, ...otherSpecialties] = profile.specialties;
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
      className="flex flex-col gap-6 rounded-t-xl bg-pure-white px-4 pt-6 pb-5 sm:px-10 sm:pt-8"
    >
      <div className="flex items-start gap-4 sm:gap-8">
        <SharedTransition name={sharedNames.specialistPhoto(profile.id)}>
          <Avatar
            decorative
            name={profile.name}
            src={profile.photoUrl}
            size="3xl"
            preload
            className="size-24 text-headline-sm sm:size-32 sm:text-headline-lg lg:size-44.5 lg:text-display-sm"
          />
        </SharedTransition>
        <div className="flex min-w-0 flex-1 flex-col gap-2.5 lg:pt-6">
          <div className="flex min-w-0 items-center gap-2.5">
            {/* Two lines before cutting: a full name rarely fits one on a phone. */}
            <SharedTransition name={sharedNames.specialistName(profile.id)}>
              <h1
                id="specialist-name"
                className="line-clamp-2 text-title-lg font-bold text-pure-black sm:text-subtitle-l"
              >
                {profile.name}
              </h1>
            </SharedTransition>
            {profile.verified ? (
              <Icon
                icon={VerifiedFill}
                size={16}
                label={t('search.verifiedSpecialist')}
                className="shrink-0 text-verified"
              />
            ) : null}
          </div>
          {firstSpecialty ? (
            <p className="inline-flex max-w-full items-center gap-1.5 self-start rounded-full bg-secondary px-2.5 py-1 text-body-xs font-medium text-pure-white">
              <Icon icon={Stethoscope} size={16} className="shrink-0" />
              <span className="truncate">
                {firstSpecialty.name}
                {otherSpecialties.length > 0
                  ? ` ${t('search.specialtiesCount', { count: otherSpecialties.length })}`
                  : null}
              </span>
            </p>
          ) : null}
          <OfficesLink
            offices={profile.offices}
            specialistName={profile.name}
          />
          {count > 0 && average !== null && averageText !== null ? (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <StarsRating
                value={average}
                label={t('specialists.starsLabel', { rating: averageText })}
              />
              <span aria-hidden="true" className="text-body-xxxs font-semibold">
                {averageText}
              </span>
              <span className="text-body-xxxs whitespace-nowrap text-text-secondary">
                {`(${String(count)} ${count === 1 ? t('rating.review') : t('rating.reviews')})`}
              </span>
            </p>
          ) : null}
        </div>
        <FavoriteButton specialistId={profile.id} />
      </div>
      {/* Side by side; alone, «Compartir» takes the row (no booking for a
          specialist, AGENTS.md §1). */}
      <div className="flex gap-2.5 *:min-w-0 *:flex-1">
        <BookButton className="w-full" />
        <ShareLinkButton
          url={absoluteUrl(routes.specialist(profile.id))}
          label={t('specialists.share')}
          copied={t('specialists.shareCopied')}
          className="w-full"
        />
      </div>
      <hr className="border-white-500" />
    </section>
  );
}
