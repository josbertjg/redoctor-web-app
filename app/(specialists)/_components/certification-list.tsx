import Image from 'next/image';

import { useTranslations } from 'next-intl';

import type {
  CertificationType,
  SpecialistProfile,
} from '@/app/lib/schemas/specialists';

const typeKeys = {
  DIPLOMA: 'diploma',
  COURSE: 'course',
  WORKSHOP: 'workshop',
  FELLOW: 'fellow',
} as const satisfies Record<CertificationType, string>;

/*
 * The specialist's certifications (the app's «Certificaciones» tab): the type
 * as a pill and «Name: institution (year)». The pill is the app's green-500
 * with white words (2.8:1, under AA: the owner's rule, 2026-11-16).
 */
export function CertificationList({
  certifications,
  emptyDescription,
  variant = 'pills',
}: {
  certifications: SpecialistProfile['certifications'];
  /** `bullets`: the public profile's plain list (Figma, 2026-11-16), no type pills. */
  variant?: 'pills' | 'bullets';
  /** A line under «Aún no hay certificaciones…»: the specialist's own profile invites to add them. */
  emptyDescription?: string;
}) {
  const t = useTranslations();

  if (certifications.length === 0) {
    return (
      <div className="flex animate-fade-in flex-col items-center gap-3 py-4 text-center">
        <Image
          src="/illustrations/no-data-found.svg"
          alt=""
          width={132}
          height={146}
          className="h-auto w-24"
        />
        <p className="text-body-xxs text-text-secondary">
          {t('specialistProfile.noCertifications')}
        </p>
        {emptyDescription ? (
          <p className="max-w-sm text-body-xxs text-text-secondary">
            {emptyDescription}
          </p>
        ) : null}
      </div>
    );
  }

  if (variant === 'bullets') {
    return (
      <ul className="flex list-disc flex-col gap-1 pl-5 text-body-xxs text-on-surface marker:text-text-secondary">
        {certifications.map((certification, index) => (
          <li key={`${String(index)}-${certification.name}`}>
            {certification.name}
            {certification.institution
              ? `, ${certification.institution}`
              : null}
            {certification.year ? ` (${String(certification.year)})` : null}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {certifications.map((certification, index) => (
        <li
          key={`${String(index)}-${certification.name}`}
          className="flex flex-col items-start gap-2 sm:flex-row sm:items-center"
        >
          {certification.type ? (
            <span className="min-w-26 rounded-full bg-secondary px-3.5 py-2 text-center text-body-xxs font-medium text-pure-white">
              {t(`certificationTypes.${typeKeys[certification.type]}`)}
            </span>
          ) : null}
          <p className="text-body-xxs text-on-surface">
            <strong className="font-semibold">{certification.name}</strong>
            {certification.institution
              ? `: ${certification.institution}`
              : null}
            {certification.year === null
              ? null
              : ` (${String(certification.year)})`}
          </p>
        </li>
      ))}
    </ul>
  );
}
