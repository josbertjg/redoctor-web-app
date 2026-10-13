'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import type { SessionUser } from '@/app/lib/firebase/client';
import type { AppointmentSummary } from '@/app/lib/schemas/appointments';

import { ReviewForm } from './review-form';

type ReviewWallProps = {
  /** The consultations still to rate, the oldest first. */
  appointments: readonly AppointmentSummary[];
  user: SessionUser;
  onReviewed: (appointmentId: string) => void;
};

/*
 * The review wall (M7, AGENTS.md §1): `/appointments` is held until every
 * finished consultation is rated, one at a time, the oldest first, as the
 * app does. The bar stays, so the person can leave the page; pages reached
 * through a link (`/i`, `/a`, `/s`) are never held.
 */
export function ReviewWall({
  appointments,
  user,
  onReviewed,
}: ReviewWallProps) {
  const t = useTranslations('reviews.gate');
  const [done, setDone] = useState(0);
  const current = appointments[0];
  if (!current) return null;
  const total = done + appointments.length;

  return (
    <div className="flex w-full flex-col gap-4">
      <header className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-headline-sm text-text-primary">{t('title')}</h1>
          {total > 1 ? (
            // Read aloud as it moves on: «2 de 3».
            <p
              aria-live="polite"
              className="shrink-0 text-label-md text-text-secondary"
            >
              {t('step', { current: done + 1, total })}
            </p>
          ) : null}
        </div>
        <p className="text-body-md text-text-secondary">
          {appointments.length > 1
            ? t('descriptionMany', { count: appointments.length })
            : t('description')}
        </p>
      </header>
      {/* A fresh form for each consultation: nothing carries over. */}
      <ReviewForm
        key={current.id}
        appointment={current}
        user={user}
        onSubmitted={() => {
          setDone((count) => count + 1);
          onReviewed(current.id);
        }}
      />
    </div>
  );
}
