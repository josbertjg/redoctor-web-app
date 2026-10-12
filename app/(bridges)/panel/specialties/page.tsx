import type { Metadata } from 'next';

import Stethoscope from '@material-symbols/svg-400/rounded/stethoscope.svg?svgr';
import { getTranslations } from 'next-intl/server';

import { smartAppBanner } from '@/app/lib/app-bridge';
import { routes } from '@/app/lib/routes';

import { BridgeContent } from '../../_components/bridge-content';

const path = routes.specialtiesBridge();

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('bridges.specialties');
  return { title: t('metaTitle'), ...smartAppBanner(path) };
}

/* «Mis especialidades»: the button of the emails about their review. */
export default async function SpecialtiesBridgePage() {
  const t = await getTranslations('bridges.specialties');

  return (
    <BridgeContent
      icon={Stethoscope}
      title={t('title')}
      description={t('description')}
      path={path}
      source="email"
    />
  );
}
