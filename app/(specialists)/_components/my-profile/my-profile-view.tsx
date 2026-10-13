'use client';

import AddAPhoto from '@material-symbols/svg-400/rounded/add_a_photo.svg?svgr';
import EditNote from '@material-symbols/svg-400/rounded/edit_note.svg?svgr';
import HistoryEdu from '@material-symbols/svg-400/rounded/history_edu.svg?svgr';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import type { SessionUser } from '@/app/lib/firebase/client';
import { meQueryOptions } from '@/app/lib/queries/identity';
import { myOfficesQueryOptions } from '@/app/lib/queries/offices';
import { myProfileQueryOptions } from '@/app/lib/queries/specialists';
import { routes } from '@/app/lib/routes';
import {
  rejectedSpecialties,
  type MyProfile,
} from '@/app/lib/schemas/specialists';

import { useSession } from '@/app/hooks/use-session';

import { EditInAppCard } from '../edit-in-app-card';
import { Gallery } from '../gallery';
import { PanelLoadError } from '../panel-load-error';
import { ShowMoreText } from '../show-more-text';
import { MyProfileSkeleton } from './my-profile-skeleton';
import { ProfileBlock, ProfileBlockEmpty } from './profile-block';
import { ProfileHeader } from './profile-header';
import { ProfileIdentity } from './profile-identity';
import { ProfileOffices } from './profile-offices';
import { ProfilePrices } from './profile-prices';
import { ProfileSchedules } from './profile-schedules';
import { ProfileStatusCard } from './profile-status-card';
import { ProfileTraining } from './profile-training';

/** A specialist with no professional profile yet: every section to fill. */
const blankProfile: MyProfile = {
  id: '',
  name: null,
  photoUrl: null,
  description: null,
  experience: null,
  certifications: [],
  gallery: [],
  specialties: [],
};

/*
 * `/panel/profile` (M14): the app's «Perfil» tab on the web, read only —
 * whether patients find the specialist and what is missing when they do
 * not (the email «Perfil no visible» leads here), then the profile as the
 * app shows it to its owner, section by section. Everything is edited in
 * the app.
 */
export function MyProfileView() {
  const { user } = useSession();
  if (user === null) return <MyProfileSkeleton />;
  return <SpecialistProfile user={user} />;
}

function SpecialistProfile({ user }: { user: SessionUser }) {
  const t = useTranslations();
  const { account } = useSession();
  // The profile's state comes with the account: read again on arrival, as
  // the app may have just changed what was missing.
  const me = useQuery({ ...meQueryOptions(user), refetchOnMount: 'always' });
  const profile = useQuery(myProfileQueryOptions(user));
  // Edited in the app: a visit here reads them again after a minute.
  const offices = useQuery({
    ...myOfficesQueryOptions(user),
    staleTime: 60_000,
  });

  if (profile.isError || offices.isError) {
    return (
      <div className="flex flex-col gap-6">
        <ProfileHeader specialistId={null} />
        <PanelLoadError
          error={profile.error ?? offices.error}
          title={t('profile.loadErrorTitle')}
          description={t('profile.loadErrorDescription')}
          retrying={profile.isFetching || offices.isFetching}
          onRetry={() => {
            if (profile.isError) void profile.refetch();
            if (offices.isError) void offices.refetch();
          }}
        />
      </div>
    );
  }
  if (profile.isPending || offices.isPending) return <MyProfileSkeleton />;

  const data = profile.data ?? blankProfile;
  const name = data.name ?? account?.name ?? '';
  const visibility = (me.data ?? account)?.visibility ?? null;
  const moreLabels = { more: t('readMore'), less: t('showLess') };

  return (
    <div className="flex flex-col gap-6">
      <ProfileHeader specialistId={profile.data?.id ?? null} />
      {visibility === null ? null : (
        <ProfileStatusCard
          visibility={visibility}
          rejectedCount={rejectedSpecialties(data.specialties).length}
          onlyInactiveOffices={
            offices.data.length > 0 &&
            offices.data.every((office) => !office.isActive)
          }
        />
      )}
      <ProfileIdentity
        name={name}
        photo={account?.photo ?? data.photoUrl}
        specialties={data.specialties}
      />
      <ProfileBlock title={t('description')}>
        {data.description ? (
          <ShowMoreText
            text={data.description}
            limit={190}
            labels={moreLabels}
          />
        ) : (
          <ProfileBlockEmpty icon={EditNote}>
            {t('specialistProfile.addDescription')}
          </ProfileBlockEmpty>
        )}
      </ProfileBlock>
      <ProfileOffices user={user} offices={offices.data} />
      <ProfilePrices user={user} offices={offices.data} />
      <ProfileSchedules user={user} offices={offices.data} />
      <ProfileBlock title={t('specialistProfile.aboutSpecialist')}>
        {data.gallery.length > 0 ? (
          <Gallery images={data.gallery} name={name} inset />
        ) : (
          <ProfileBlockEmpty icon={AddAPhoto}>
            {t('specialistProfile.addPhotos')}
          </ProfileBlockEmpty>
        )}
      </ProfileBlock>
      <ProfileBlock title={t('experience')}>
        {data.experience ? (
          <ShowMoreText
            text={data.experience}
            limit={400}
            labels={moreLabels}
          />
        ) : (
          <ProfileBlockEmpty icon={HistoryEdu}>
            {t('specialistProfile.addExperience')}
          </ProfileBlockEmpty>
        )}
      </ProfileBlock>
      <ProfileTraining name={name} profile={data} />
      <EditInAppCard
        title={t('profile.editInApp.title')}
        description={t('profile.editInApp.description')}
        path={routes.specialistProfile()}
      />
    </div>
  );
}
