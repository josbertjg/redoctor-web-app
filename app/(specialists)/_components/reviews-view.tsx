import Image from 'next/image';

import Person from '@material-symbols/svg-400/rounded/person.svg?svgr';
import StarFill from '@material-symbols/svg-400/rounded/star-fill.svg?svgr';
import { useFormatter, useTranslations } from 'next-intl';

import type { Review, SpecialistReviews } from '@/app/lib/schemas/reviews';

import { EmptyState } from '@/app/ui/empty-state';
import { Icon } from '@/app/ui/icons';
import { StarsRating } from '@/app/ui/stars-rating';

const starRows = [5, 4, 3, 2, 1] as const;

/*
 * The specialist's reviews (Figma, 2026-11-16): the overall rating, big,
 * with its stars, the share of each star as a bar in the primary blue, the
 * count, and the latest reviews — the stars, the words, the day and the
 * author. Authors are «María P.» at most (shortened on the server), or
 * «Usuario de Redoctor».
 */
export function ReviewsView({
  reviews,
  specialistName,
}: {
  reviews: SpecialistReviews;
  specialistName: string;
}) {
  const t = useTranslations();

  if (reviews.total === 0 || reviews.reviews.length === 0) {
    return (
      <EmptyState
        headingLevel={3}
        className="py-4"
        illustration={
          <Image
            src="/illustrations/no-reviews-yet.svg"
            alt=""
            width={227}
            height={149}
            className="h-auto w-44"
          />
        }
        title={t('search.noReviewsYet')}
        description={t('search.beFirstToReview', { name: specialistName })}
      />
    );
  }

  return (
    <div className="flex animate-fade-in flex-col gap-5">
      <RatingSummary reviews={reviews} />
      <div className="flex flex-col gap-2.5">
        <h3 className="text-body-xs font-semibold text-pure-black">
          {reviews.total === 1
            ? t('reviews.list.countOne', { count: reviews.total })
            : t('reviews.list.countMany', { count: reviews.total })}
        </h3>
        <ul className="flex flex-col gap-3">
          {reviews.reviews.map((review) => (
            <ReviewItem key={review.id} review={review} />
          ))}
        </ul>
      </div>
    </div>
  );
}

function RatingSummary({ reviews }: { reviews: SpecialistReviews }) {
  const t = useTranslations();
  const format = useFormatter();
  const average = reviews.rating.average ?? 0;
  const averageText = format.number(average, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-12">
      <div className="flex shrink-0 flex-col gap-1.5">
        <p className="text-body-xxs font-medium text-text-secondary">
          {t('reviews.list.overall')}
        </p>
        <p
          aria-hidden="true"
          className="text-title-xxxl leading-none font-bold text-pure-black"
        >
          {averageText}
        </p>
        <StarsRating
          value={average}
          size={24}
          label={t('specialists.starsLabel', { rating: averageText })}
        />
      </div>
      <ul className="flex min-w-0 flex-1 flex-col gap-0.5">
        {starRows.map((stars) => {
          const { percent } = reviews.distribution[stars];
          const percentText = format.number(percent / 100, {
            style: 'percent',
            maximumFractionDigits: 0,
          });
          return (
            <li
              key={stars}
              className="flex h-6 items-center gap-2 text-body-xxs font-medium"
            >
              <span className="sr-only">
                {t('specialists.distributionLabel', {
                  stars,
                  percent: percentText,
                })}
              </span>
              <span
                aria-hidden="true"
                className="flex w-9 shrink-0 items-center gap-1 text-pure-black"
              >
                {stars}
                <Icon icon={StarFill} size={24} className="text-warning-500" />
              </span>
              <span
                aria-hidden="true"
                className="h-3.5 flex-1 overflow-hidden rounded-full bg-blue-50"
              >
                <span
                  className="block h-full rounded-full bg-primary"
                  // The share comes from the data: no token can express it.
                  style={{ width: `${String(percent)}%` }}
                />
              </span>
              <span
                aria-hidden="true"
                className="w-10 shrink-0 text-right text-text-secondary"
              >
                {percentText}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ReviewItem({ review }: { review: Review }) {
  const t = useTranslations();
  const format = useFormatter();

  return (
    <li className="flex flex-col gap-1.5">
      <StarsRating
        value={review.rating}
        label={t('specialists.starsLabel', { rating: review.rating })}
      />
      {review.comment ? (
        <p className="text-body-xxs whitespace-pre-line text-pure-black">
          {review.comment}
        </p>
      ) : (
        <p className="text-body-xxs text-text-secondary italic">
          {t('reviews.list.noComment')}
        </p>
      )}
      <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-body-xxxs text-text-secondary">
        <time dateTime={review.createdAt}>
          {format.dateTime(new Date(review.createdAt), {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </time>
        <span className="inline-flex items-center gap-0.5 font-semibold text-grey-800">
          <Icon icon={Person} size={16} />
          {review.author ?? t('reviews.list.anonymous')}
        </span>
      </p>
    </li>
  );
}
