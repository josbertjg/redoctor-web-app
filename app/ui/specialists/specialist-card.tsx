import Link from 'next/link';

import LocationOn from '@material-symbols/svg-400/rounded/location_on.svg?svgr';
import Stethoscope from '@material-symbols/svg-400/rounded/stethoscope.svg?svgr';
import VerifiedFill from '@material-symbols/svg-400/rounded/verified-fill.svg?svgr';
import { useFormatter, useTranslations } from 'next-intl';

import { formatDistance } from '@/app/lib/format/distance';
import { formatPrice } from '@/app/lib/format/money';
import { routes } from '@/app/lib/routes';
import type { SearchResult } from '@/app/lib/schemas/search';
import { cn } from '@/app/lib/utils';

import { Avatar } from '@/app/ui/avatar';
import { Icon } from '@/app/ui/icons';
import {
  sharedNames,
  SharedTransition,
} from '@/app/ui/motion/view-transitions';
import { StarsRating } from '@/app/ui/stars-rating';

import { usePriceWords } from '@/app/hooks/use-price-words';

import { AvailabilityStrip } from './availability-strip';

export const specialistCardId = (id: string) => `specialist-${id}`;

type SpecialistCardProps = {
  specialist: SearchResult;
  /** How far the office is, when the list was asked from a point and the API measured it. */
  showDistance?: boolean;
  /** The pointer is on its pin, or on it (the search's map). */
  active?: boolean;
  /** Taken on the map: the card stands out until another is. */
  selected?: boolean;
  /** Under a page's h1 (the search's results) it is 2; under a section's h2, 3. */
  headingLevel?: 2 | 3;
  /** Fades up as it mounts (a list that grows); a section with its own entrance turns it off. */
  entrance?: boolean;
  className?: string;
};

/*
 * One specialist, as the app's search card: photo, name with the verified
 * mark, every specialty, the rating when there are reviews, the nearest
 * office — with how far it is, which the app never says, when the list
 * was asked from a point — and the lowest price («$ 45», «Desde $ 25», «A
 * consultar»); then the next days of that office. The card opens the
 * profile; a day, the booking on it. The search's results and the
 * highlights (REDOC-177: the landing, the search with nothing asked) share
 * it, as the API shares the item. It renders on the server too: the
 * landing sends no search copy to the browser (only the avatar and the
 * row of days hydrate).
 */
export function SpecialistCard({
  specialist,
  showDistance = true,
  active = false,
  selected = false,
  headingLevel = 2,
  entrance = true,
  className,
}: SpecialistCardProps) {
  const t = useTranslations();
  const format = useFormatter();
  const words = usePriceWords();
  const { average, count } = specialist.rating;
  const averageText =
    average === null
      ? null
      : format.number(average, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        });
  const price = formatPrice(specialist.price, words);
  const otherOffices = specialist.office.count - 1;
  const distance = showDistance ? specialist.office.distanceMeters : null;
  const cardId = specialistCardId(specialist.id);
  const Heading = headingLevel === 3 ? 'h3' : 'h2';

  return (
    <article
      id={cardId}
      // The name alone names the card: the verified mark beside it is not part of it.
      aria-labelledby={`${cardId}-name`}
      data-active={active || undefined}
      data-selected={selected || undefined}
      className={cn(
        'relative flex flex-col gap-4 rounded-2xl bg-pure-white p-4 shadow-md ring-2 ring-transparent transition-[box-shadow,translate] duration-base ease-house',
        'data-active:-translate-y-0.5 data-active:shadow-lg data-selected:ring-primary/40',
        entrance && 'animate-fade-up',
        className,
      )}
    >
      <div className="flex gap-4">
        {/* The photo and the name travel to the profile's as it opens
            (AGENTS.md §8, rule 13), and back to the card on the way back. */}
        <SharedTransition name={sharedNames.specialistPhoto(specialist.id)}>
          <Avatar
            name={specialist.name}
            src={specialist.photoUrl}
            size="lg"
            decorative
            className="shrink-0"
          />
        </SharedTransition>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Heading className="flex items-start gap-1 text-title-md text-text-primary">
            {/* The whole card opens the profile: the name's link stretches
                over it (its ::after), with no link inside another. The days
                sit above it (the strip's z-index) and open the booking. */}
            <Link
              id={`${cardId}-name`}
              href={routes.specialist(specialist.id)}
              className="wrap-break-word outline-none after:absolute after:inset-0 after:rounded-2xl after:content-[''] hover:underline focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
            >
              {/* A box of its own, the name alone: what travels. */}
              <SharedTransition
                name={sharedNames.specialistName(specialist.id)}
              >
                <span className="block">{specialist.name}</span>
              </SharedTransition>
            </Link>
            {specialist.verified ? (
              <Icon
                icon={VerifiedFill}
                size={18}
                label={t('search.verifiedSpecialist')}
                className="mt-1 shrink-0 text-verified"
              />
            ) : null}
          </Heading>
          {specialist.specialties.length > 0 ? (
            <p className="flex items-start gap-1 text-body-sm text-text-secondary">
              <Icon icon={Stethoscope} size={16} className="mt-0.5 shrink-0" />
              <span className="wrap-break-word">
                {specialist.specialties
                  .map((specialty) => specialty.name)
                  .join(', ')}
              </span>
            </p>
          ) : null}
          {count > 0 && average !== null && averageText !== null ? (
            <p className="flex flex-wrap items-center gap-1 text-body-sm">
              <StarsRating
                value={average}
                label={t('specialists.starsLabel', { rating: averageText })}
              />
              <span
                aria-hidden="true"
                className="font-semibold text-text-primary"
              >
                {averageText}
              </span>
              <span className="text-text-secondary">
                ({count}{' '}
                {count === 1 ? t('rating.review') : t('rating.reviews')})
              </span>
            </p>
          ) : null}
          <p className="flex items-start gap-1 text-body-sm text-text-secondary">
            <Icon icon={LocationOn} size={16} className="mt-0.5 shrink-0" />
            <span className="wrap-break-word">
              <span className="font-medium text-text-primary">
                {specialist.office.name}
              </span>
              {distance !== null ? (
                <>
                  {' · '}
                  {t('search.web.distanceAway', {
                    distance: formatDistance(distance),
                  })}
                </>
              ) : null}
              {otherOffices > 0
                ? ` · ${t('search.officesCount', { count: otherOffices })}`
                : null}
            </span>
          </p>
          <p
            className={cn(
              'text-body-md',
              price === null
                ? 'text-text-secondary'
                : 'font-semibold text-text-primary',
            )}
          >
            {price ?? t('search.priceOnRequestShort')}
          </p>
        </div>
      </div>
      <AvailabilityStrip
        specialistId={specialist.id}
        specialistName={specialist.name}
        officeId={specialist.office.id}
        days={specialist.days}
      />
    </article>
  );
}
