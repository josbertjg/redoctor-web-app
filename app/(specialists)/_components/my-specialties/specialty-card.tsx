'use client';

import { useId } from 'react';

import Badge from '@material-symbols/svg-400/rounded/badge.svg?svgr';
import ErrorIcon from '@material-symbols/svg-400/rounded/error.svg?svgr';
import HourglassTop from '@material-symbols/svg-400/rounded/hourglass_top.svg?svgr';
import MedicalInformation from '@material-symbols/svg-400/rounded/medical_information.svg?svgr';
import School from '@material-symbols/svg-400/rounded/school.svg?svgr';
import Verified from '@material-symbols/svg-400/rounded/verified.svg?svgr';
import { useTranslations } from 'next-intl';

import type { MySpecialty } from '@/app/lib/schemas/specialists';

import { Icon } from '@/app/ui/icons';
import { StateChip } from '@/app/ui/state-chip';

/** The app's chip for each review; a status this version does not know reads as in review. */
const reviewChips = {
  verified: { tone: 'positive', icon: Verified, label: 'verified' },
  pending: { tone: 'warning', icon: HourglassTop, label: 'pending' },
  unknown: { tone: 'warning', icon: HourglassTop, label: 'pending' },
  rejected: { tone: 'error', icon: ErrorIcon, label: 'rejected' },
} as const;

/*
 * One specialty as the app's card shows it: the branch of the catalog it
 * hangs from, its name and where its review stands, the institution and
 * the license behind it, its subspecialties, and when it was rejected, the
 * reason. Corrected or removed in the app.
 */
export function SpecialtyCard({ specialty }: { specialty: MySpecialty }) {
  const t = useTranslations('mySpecialties');
  const tRoot = useTranslations();
  const headingId = useId();
  const chip = reviewChips[specialty.review];
  const parents = specialty.path.slice(0, -1);

  return (
    <article
      aria-labelledby={headingId}
      className="flex animate-fade-up flex-col gap-3 rounded-2xl bg-pure-white p-5 shadow-sm"
    >
      <div className="flex flex-col gap-1">
        {parents.length > 0 ? (
          <p className="text-label-md text-text-secondary">
            {parents.join(' · ')}
          </p>
        ) : null}
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <h2
            id={headingId}
            className="min-w-0 text-title-md text-text-primary"
          >
            {specialty.name}
          </h2>
          <StateChip tone={chip.tone} icon={chip.icon}>
            {t(`status.${chip.label}`)}
          </StateChip>
        </div>
      </div>

      <dl className="flex flex-col gap-2 text-body-md text-text-primary">
        <div className="flex items-start gap-2">
          <dt>
            <Icon
              icon={School}
              size={20}
              label={t('collegeLabel')}
              className="text-primary"
            />
          </dt>
          <dd className="min-w-0">{specialty.college}</dd>
        </div>
        <div className="flex items-start gap-2">
          <dt className="flex items-center gap-2 text-text-secondary">
            <Icon icon={Badge} size={20} className="text-primary" />
            {t('licenseNumber')}
          </dt>
          <dd className="font-semibold tabular-nums">{specialty.license}</dd>
        </div>
        {specialty.subspecialties.length > 0 ? (
          <div className="flex items-start gap-2">
            <dt>
              <Icon
                icon={MedicalInformation}
                size={20}
                label={t('subspecialtiesLabel')}
                className="text-primary"
              />
            </dt>
            <dd className="min-w-0">{specialty.subspecialties.join(', ')}</dd>
          </div>
        ) : null}
      </dl>

      {specialty.review === 'rejected' ? (
        <div className="flex flex-col gap-1 rounded-xl bg-error-light px-4 py-3">
          <p className="text-label-md tracking-wide text-error-800">
            {tRoot('rejectionReason')}
          </p>
          <p className="text-body-md text-text-primary">
            {specialty.rejectionReason ?? t('noRejectionReason')}
          </p>
        </div>
      ) : null}
    </article>
  );
}
