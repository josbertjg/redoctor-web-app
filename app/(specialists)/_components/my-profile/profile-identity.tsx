'use client';

import { useId } from 'react';

import ErrorIcon from '@material-symbols/svg-400/rounded/error.svg?svgr';
import HourglassTop from '@material-symbols/svg-400/rounded/hourglass_top.svg?svgr';
import Stethoscope from '@material-symbols/svg-400/rounded/stethoscope.svg?svgr';
import VerifiedFill from '@material-symbols/svg-400/rounded/verified-fill.svg?svgr';
import { useTranslations } from 'next-intl';

import { sizedPhotoUrl } from '@/app/lib/photos';
import {
  hasPendingSpecialties,
  specialtiesReview,
  visibleSpecialties,
  type MySpecialty,
} from '@/app/lib/schemas/specialists';

import { Avatar } from '@/app/ui/avatar';
import { Icon } from '@/app/ui/icons';
import { StateChip } from '@/app/ui/state-chip';

/*
 * The head of «Mi perfil», as the app's card: the photo, the professional
 * name with the verified mark once a specialty is, and its badges — each
 * specialty patients see, and whether others are in review or were
 * rejected, or «Nuevo en Redoctor» before the first. The specialty badges
 * keep the app's brand green (the owner's rule for brand surfaces).
 */
export function ProfileIdentity({
  name,
  photo,
  specialties,
}: {
  name: string;
  photo: string | null;
  specialties: readonly MySpecialty[];
}) {
  const t = useTranslations();
  const nameId = useId();
  const visible = visibleSpecialties(specialties);
  const review = specialtiesReview(specialties);

  return (
    <section
      aria-labelledby={nameId}
      className="flex animate-fade-up flex-col items-center gap-4 rounded-2xl bg-pure-white p-5 text-center shadow-md sm:flex-row sm:text-left"
    >
      <Avatar
        decorative
        name={name}
        // 4x the 96 px avatar: sharp on 3x screens.
        src={photo && sizedPhotoUrl(photo, 384)}
        size="xl"
      />
      <div className="flex min-w-0 flex-col items-center gap-2.5 sm:items-start">
        <div className="flex max-w-full items-center gap-1">
          <h2
            id={nameId}
            className="line-clamp-2 text-title-lg text-balance text-text-primary"
          >
            {name}
          </h2>
          {visible.length > 0 ? (
            <Icon
              icon={VerifiedFill}
              size={20}
              label={t('search.verifiedSpecialist')}
              className="shrink-0 text-verified"
            />
          ) : null}
        </div>
        <ul className="flex flex-wrap justify-center gap-1.5 sm:justify-start">
          {visible.map((specialty) => (
            <li
              key={specialty.id}
              className="inline-flex max-w-full animate-fade-in items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-label-md text-on-secondary"
            >
              <Icon icon={Stethoscope} size={16} />
              <span className="truncate">{specialty.name}</span>
            </li>
          ))}
          {hasPendingSpecialties(specialties) ? (
            <li>
              <StateChip tone="warning" icon={HourglassTop}>
                {t('specialistProfile.specialtiesUnderReviewBadge')}
              </StateChip>
            </li>
          ) : null}
          {review === 'rejected' ? (
            <li>
              <StateChip tone="error" icon={ErrorIcon}>
                {t('specialistProfile.specialtiesRejectedBadge')}
              </StateChip>
            </li>
          ) : null}
          {specialties.length === 0 ? (
            <li>
              <StateChip tone="info">
                {t('specialistProfile.newUser')}
              </StateChip>
            </li>
          ) : null}
        </ul>
      </div>
    </section>
  );
}
