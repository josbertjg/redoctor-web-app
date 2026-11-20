import { Suspense, type ReactNode } from 'react';

import School from '@material-symbols/svg-400/rounded/school.svg?svgr';
import WorkspacePremium from '@material-symbols/svg-400/rounded/workspace_premium.svg?svgr';
import { useTranslations } from 'next-intl';

import type { SpecialistProfile } from '@/app/lib/schemas/specialists';

import { Icon, type IconComponent } from '@/app/ui/icons';

import { CertificationList } from '../certification-list';
import { Gallery } from '../gallery';
import { ProfilePlaceholder } from '../profile-section';
import { ReviewsSkeleton } from '../profile-skeletons';
import { ReviewsSection } from '../reviews-section';
import { SpecialtyList } from '../specialty-list';

/** The profile's sections, by the anchors its tabs lead to. */
export const profileSections = {
  description: 'descripcion',
  reviews: 'opiniones',
  about: 'sobre-el-especialista',
} as const;

/*
 * The public profile's content card (Figma, 2026-11-16), one section after
 * another, as its tabs name them: «Descripción»; «Opiniones», which stream
 * in after the profile under their own Suspense (the page never waits for
 * them); and «Sobre este especialista» — the photos in a row, the
 * experience, «Educación» (each verified specialty with its college) and
 * «Certificaciones».
 */
export function ProfileContent({ profile }: { profile: SpecialistProfile }) {
  const t = useTranslations();
  const hasAbout = profile.gallery.length > 0 || profile.experience !== null;

  return (
    <div className="mt-6 flex flex-col gap-10 rounded-xl bg-pure-white px-4 py-8 sm:px-10">
      <ProfileContentSection
        id={profileSections.description}
        title={t('description')}
      >
        {profile.description ? (
          <p className="text-body-xs whitespace-pre-line text-grey-800">
            {profile.description}
          </p>
        ) : (
          <ProfilePlaceholder>{t('search.noDescription')}</ProfilePlaceholder>
        )}
      </ProfileContentSection>

      <ProfileContentSection
        id={profileSections.reviews}
        title={t('reviews.title')}
      >
        <Suspense fallback={<ReviewsSkeleton />}>
          <ReviewsSection
            specialistId={profile.id}
            specialistName={profile.name}
          />
        </Suspense>
      </ProfileContentSection>

      <ProfileContentSection
        id={profileSections.about}
        title={t('specialistProfile.aboutSpecialist')}
      >
        <div className="flex flex-col gap-5">
          {hasAbout ? (
            <div className="flex flex-col gap-4">
              {profile.gallery.length > 0 ? (
                <Gallery
                  images={profile.gallery}
                  name={profile.name}
                  inset
                  variant="strip"
                />
              ) : null}
              {profile.experience ? (
                <p className="text-body-xxs whitespace-pre-line text-grey-800">
                  {profile.experience}
                </p>
              ) : null}
            </div>
          ) : (
            <ProfilePlaceholder>
              {t('search.noAboutSpecialist')}
            </ProfilePlaceholder>
          )}
          <AboutBlock icon={School} title={t('education')}>
            <SpecialtyList specialties={profile.specialties} iconsByDepth />
          </AboutBlock>
          <AboutBlock icon={WorkspacePremium} title={t('certifications')}>
            <CertificationList
              certifications={profile.certifications}
              variant="bullets"
            />
          </AboutBlock>
        </div>
      </ProfileContentSection>
    </div>
  );
}

function ProfileContentSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  const titleId = `${id}-title`;
  return (
    // Its title clears the tabs that stay at the top of the screen.
    <section
      id={id}
      aria-labelledby={titleId}
      className="flex scroll-mt-20 flex-col gap-2.5"
    >
      <h2
        id={titleId}
        className="text-subtitle-s font-semibold text-pure-black"
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function AboutBlock({
  icon,
  title,
  children,
}: {
  icon: IconComponent;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <h3 className="flex items-center gap-2.5 text-body-xs font-semibold text-pure-black">
        <Icon icon={icon} size={16} className="text-primary" />
        {title}
      </h3>
      <div className="pl-6.5">{children}</div>
    </div>
  );
}
