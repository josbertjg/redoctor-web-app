import { useTranslations } from 'next-intl';

import { SiteHeader } from '@/app/ui/layout/site-header';

import {
  ProfileHeroSkeleton,
  ProfileSectionsSkeleton,
} from '../../_components/profile-skeletons';

/* The profile's skeleton: the blue header and the first sections, at their final size. */
export default function SpecialistProfileLoading() {
  const t = useTranslations('common');

  return (
    <div role="status" className="flex flex-1 flex-col">
      <span className="sr-only">{t('loading')}</span>
      <div className="bg-primary">
        <SiteHeader homeLabel={t('homeLabel')} tone="inverse" />
      </div>
      <ProfileHeroSkeleton />
      <ProfileSectionsSkeleton />
    </div>
  );
}
