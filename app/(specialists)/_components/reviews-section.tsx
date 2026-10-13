import { getTranslations } from 'next-intl/server';

import { isApiError } from '@/app/lib/api/errors';
import { getSpecialistReviews } from '@/app/lib/data/reviews';
import type { SpecialistReviews } from '@/app/lib/schemas/reviews';

import { ReviewsLoadError } from './reviews-load-error';
import { ReviewsView } from './reviews-view';

/*
 * Reviews stream in after the profile (their own request, under Suspense):
 * the page never waits for them, and when they fail only this block says so.
 */
export async function ReviewsSection({
  specialistId,
  specialistName,
}: {
  specialistId: string;
  specialistName: string;
}) {
  let reviews: SpecialistReviews | null = null;
  try {
    reviews = await getSpecialistReviews(specialistId);
  } catch (error) {
    if (!isApiError(error)) throw error;
  }

  if (reviews === null) {
    const t = await getTranslations();
    return (
      <ReviewsLoadError
        message={t('reviews.list.loadError')}
        refreshLabel={t('retry')}
      />
    );
  }

  return <ReviewsView reviews={reviews} specialistName={specialistName} />;
}
