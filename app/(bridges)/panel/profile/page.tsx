import type { Metadata } from 'next';

import IdCard from '@material-symbols/svg-400/rounded/id_card.svg?svgr';
import { getTranslations } from 'next-intl/server';

import { smartAppBanner } from '@/app/lib/app-bridge';
import { routes } from '@/app/lib/routes';

import { BridgeContent } from '../../_components/bridge-content';

const path = routes.profileBridge();

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('bridges.profile');
  return { title: t('metaTitle'), ...smartAppBanner(path) };
}

/* The professional profile: the button of the email that says it stopped showing in searches. */
export default async function ProfileBridgePage() {
  const t = await getTranslations('bridges.profile');

  return (
    <BridgeContent
      icon={IdCard}
      title={t('title')}
      description={t('description')}
      path={path}
      source="email"
    />
  );
}
