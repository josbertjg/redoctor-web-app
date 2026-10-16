'use client';

import { useEffect, useRef } from 'react';

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
import { StarsRating } from '@/app/ui/stars-rating';

import { usePriceWords } from '@/app/hooks/use-price-words';

import { AvailabilityStrip } from './availability-strip';

export const resultCardId = (id: string) => `result-${id}`;

/**
 * The card tells the map when the pointer is on it, or the focus inside
 * it, so its pin stands out: listened to on the element itself (the card
 * is not a control; its links are, and the pin follows them too).
 */
function useHoverSync(id: string, onHover: (id: string | null) => void) {
  const card = useRef<HTMLElement>(null);
  const latest = useRef(onHover);
  useEffect(() => {
    latest.current = onHover;
  });
  useEffect(() => {
    const node = card.current;
    if (!node) return;
    const enter = () => {
      latest.current(id);
    };
    const leave = () => {
      latest.current(null);
    };
    node.addEventListener('mouseenter', enter);
    node.addEventListener('mouseleave', leave);
    node.addEventListener('focusin', enter);
    node.addEventListener('focusout', leave);
    return () => {
      node.removeEventListener('mouseenter', enter);
      node.removeEventListener('mouseleave', leave);
      node.removeEventListener('focusin', enter);
      node.removeEventListener('focusout', leave);
    };
  }, [id]);
  return card;
}

type ResultCardProps = {
  result: SearchResult;
  /** The search had a point: how far the office is from it. */
  showDistance: boolean;
  /** The pointer is on its pin, or on it. */
  active: boolean;
  /** Taken on the map: the card stands out until another is. */
  selected: boolean;
  onHover: (id: string | null) => void;
};

/*
 * One specialist of the results, as the app's card: photo, name with the
 * verified mark, every specialty, the rating when there are reviews, the
 * nearest office — with how far it is, which the app never says — and the
 * lowest price («$ 45», «Desde $ 25», «A consultar»); then the next days
 * of that office. The card opens the profile; a day, the booking on it.
 */
export function ResultCard({
  result,
  showDistance,
  active,
  selected,
  onHover,
}: ResultCardProps) {
  const t = useTranslations();
  const format = useFormatter();
  const words = usePriceWords();
  const { average, count } = result.rating;
  const averageText =
    average === null
      ? null
      : format.number(average, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        });
  const price = formatPrice(result.price, words);
  const otherOffices = result.office.count - 1;

  const card = useHoverSync(result.id, onHover);

  return (
    <article
      ref={card}
      id={resultCardId(result.id)}
      aria-labelledby={`${resultCardId(result.id)}-name`}
      // The name alone names the card: the verified mark beside it is not part of it.
      data-active={active || undefined}
      data-selected={selected || undefined}
      className={cn(
        'relative flex animate-fade-up flex-col gap-4 rounded-2xl bg-pure-white p-4 shadow-md ring-2 ring-transparent transition-[box-shadow,translate] duration-base ease-house',
        'data-active:-translate-y-0.5 data-active:shadow-lg data-selected:ring-primary/40',
      )}
    >
      <div className="flex gap-4">
        <Avatar
          name={result.name}
          src={result.photoUrl}
          size="lg"
          decorative
          className="shrink-0"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="flex items-start gap-1 text-title-md text-text-primary">
            {/* The whole card opens the profile: the name's link stretches
                over it (its ::after), with no link inside another. The days
                sit above it (the strip's z-index) and open the booking. */}
            <Link
              id={`${resultCardId(result.id)}-name`}
              href={routes.specialist(result.id)}
              className="wrap-break-word outline-none after:absolute after:inset-0 after:rounded-2xl after:content-[''] hover:underline focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
            >
              {result.name}
            </Link>
            {result.verified ? (
              <Icon
                icon={VerifiedFill}
                size={18}
                label={t('search.verifiedSpecialist')}
                className="mt-1 shrink-0 text-verified"
              />
            ) : null}
          </h2>
          {result.specialties.length > 0 ? (
            <p className="flex items-start gap-1 text-body-sm text-text-secondary">
              <Icon icon={Stethoscope} size={16} className="mt-0.5 shrink-0" />
              <span className="wrap-break-word">
                {result.specialties
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
                {result.office.name}
              </span>
              {showDistance ? (
                <>
                  {' · '}
                  {t('search.web.distanceAway', {
                    distance: formatDistance(result.office.distanceMeters),
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
        specialistId={result.id}
        specialistName={result.name}
        officeId={result.office.id}
        days={result.days}
      />
    </article>
  );
}
