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
 * The specialist's reviews as the app shows them: the overall rating with the
 * share of each star, the count, and the latest reviews. Authors are «María
 * P.» at most (shortened on the server), or «Usuario de Redoctor».
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
    <div className="flex animate-fade-in flex-col gap-6">
      <RatingSummary reviews={reviews} />
      <div className="flex flex-col gap-1">
        <h3 className="text-subtitle-s font-semibold text-text-primary">
          {reviews.total === 1
            ? t('reviews.list.countOne', { count: reviews.total })
            : t('reviews.list.countMany', { count: reviews.total })}
        </h3>
        <ul className="divide-y divide-divider">
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
    <div className="flex items-center gap-6 rounded-xl bg-pure-white p-4 shadow-sm">
      <div className="flex shrink-0 flex-col items-center gap-1">
        <p className="text-body-xxs font-medium text-text-secondary">
          {t('reviews.list.overall')}
        </p>
        <p
          aria-hidden="true"
          className="text-title-xxxl font-bold text-text-primary"
        >
          {averageText}
        </p>
        <StarsRating
          value={average}
          size={24}
          label={t('specialists.starsLabel', { rating: averageText })}
        />
      </div>
      <ul className="flex min-w-0 flex-1 flex-col gap-1.5">
        {starRows.map((stars) => {
          const { percent } = reviews.distribution[stars];
          const percentText = format.number(percent / 100, {
            style: 'percent',
            maximumFractionDigits: 0,
          });
          return (
            <li
              key={stars}
              className="flex items-center gap-1.5 text-body-xxxs text-text-secondary"
            >
              <span className="sr-only">
                {t('specialists.distributionLabel', {
                  stars,
                  percent: percentText,
                })}
              </span>
              <span aria-hidden="true" className="w-2 text-right">
                {stars}
              </span>
              <Icon icon={StarFill} size={16} className="text-warning-500" />
              <span
                aria-hidden="true"
                className="h-2 flex-1 overflow-hidden rounded-full bg-surface-variant"
              >
                <span
                  className="block h-full rounded-full bg-warning-500"
                  // The share comes from the data: no token can express it.
                  style={{ width: `${String(percent)}%` }}
                />
              </span>
              <span aria-hidden="true" className="w-10 text-right">
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
    <li className="flex flex-col gap-2 py-4">
      <StarsRating
        value={review.rating}
        label={t('specialists.starsLabel', { rating: review.rating })}
      />
      {review.comment ? (
        <p className="text-body-xs whitespace-pre-line text-text-primary">
          {review.comment}
        </p>
      ) : (
        <p className="text-body-xs text-text-secondary italic">
          {t('reviews.list.noComment')}
        </p>
      )}
      <p className="flex items-center gap-1.5 text-body-xxxs text-text-secondary">
        <time dateTime={review.createdAt}>
          {format.dateTime(new Date(review.createdAt), {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}
        </time>
        <Icon icon={Person} size={16} />
        <span>{review.author ?? t('reviews.list.anonymous')}</span>
      </p>
    </li>
  );
}
