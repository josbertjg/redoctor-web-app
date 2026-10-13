'use client';

import Image from 'next/image';
import Link from 'next/link';

import ChevronRight from '@material-symbols/svg-400/rounded/chevron_right.svg?svgr';
import HourglassTop from '@material-symbols/svg-400/rounded/hourglass_top.svg?svgr';
import { useTranslations } from 'next-intl';

import { routes } from '@/app/lib/routes';
import {
  hasPendingSpecialties,
  specialtiesReview,
  visibleSpecialties,
  type MyProfile,
  type MySpecialty,
} from '@/app/lib/schemas/specialists';

import { Button } from '@/app/ui/button';
import { Icon } from '@/app/ui/icons';
import { Tabs } from '@/app/ui/tabs';

import { CertificationList } from '../certification-list';
import { SpecialtyList } from '../specialty-list';

/*
 * The profile's training, as the app's two tabs: «Educación» — the
 * specialties patients see, with the college behind each — and
 * «Certificaciones». Edited in the app; «Mis especialidades» shows each
 * specialty's review.
 */
export function ProfileTraining({
  name,
  profile,
}: {
  name: string;
  profile: MyProfile;
}) {
  const t = useTranslations();

  return (
    <section className="flex animate-fade-up flex-col gap-4 rounded-2xl bg-pure-white p-5 shadow-md">
      <Tabs
        label={t('specialists.trainingLabel', { name })}
        items={[
          {
            value: 'education',
            label: t('education'),
            content: <Education specialties={profile.specialties} />,
          },
          {
            value: 'certifications',
            label: t('certifications'),
            content: (
              <CertificationList
                certifications={profile.certifications}
                emptyDescription={t(
                  'specialistProfile.noCertificationsDescription',
                )}
              />
            ),
          },
        ]}
      />
    </section>
  );
}

function Education({ specialties }: { specialties: readonly MySpecialty[] }) {
  const t = useTranslations();
  const visible = visibleSpecialties(specialties);

  if (visible.length === 0) return <EducationEmpty specialties={specialties} />;

  return (
    <div className="flex flex-col gap-4">
      <SpecialtyList
        specialties={visible.map((specialty) => ({
          name: specialty.name,
          path: specialty.path,
          college: specialty.college,
          subspecialties: specialty.subspecialties,
        }))}
      />
      {hasPendingSpecialties(specialties) ? (
        <p className="flex animate-fade-in items-start gap-2 rounded-lg bg-warning-light px-3 py-2.5 text-body-sm text-warning-800">
          <Icon icon={HourglassTop} size={18} className="shrink-0" />
          {t('specialistProfile.moreSpecialtiesUnderReview')}
        </p>
      ) : null}
      <Link
        href={routes.specialties()}
        className="inline-flex min-h-touch w-fit items-center gap-0.5 rounded-lg text-label-lg text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {t('mySpecialties.title')}
        <Icon icon={ChevronRight} size={20} />
      </Link>
    </div>
  );
}

/** No specialty patients see yet: in review, rejected, or none registered. */
function EducationEmpty({
  specialties,
}: {
  specialties: readonly MySpecialty[];
}) {
  const t = useTranslations();
  const review = specialtiesReview(specialties);
  const words =
    review === 'underReview'
      ? {
          title: t('specialistProfile.specialtiesUnderReview'),
          description: t('specialistProfile.specialtiesUnderReviewDescription'),
        }
      : review === 'rejected'
        ? {
            title: t('specialistProfile.specialtiesRejected'),
            description: t('specialistProfile.specialtiesRejectedDescription'),
          }
        : {
            title: t('specialistProfile.noEducation'),
            description: t('specialistProfile.noEducationDescription'),
          };

  return (
    <div className="flex animate-fade-in flex-col items-center gap-3 py-4 text-center">
      <Image
        src="/illustrations/no-data-found.svg"
        alt=""
        width={132}
        height={146}
        className="h-auto w-24"
      />
      <p className="text-title-sm text-text-primary">{words.title}</p>
      <p className="max-w-sm text-body-sm text-text-secondary">
        {words.description}
      </p>
      {review === 'rejected' ? (
        <Button asChild size="small" shape="soft" className="mt-1">
          <Link href={routes.specialties()}>
            {t('specialistProfile.reviewSpecialties')}
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
