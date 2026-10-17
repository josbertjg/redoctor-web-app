import type { Metadata } from 'next';

import OpenInNew from '@material-symbols/svg-400/rounded/open_in_new.svg?svgr';
import { getTranslations } from 'next-intl/server';

import { smartAppBanner } from '@/app/lib/app-bridge';
import { routes } from '@/app/lib/routes';

import { PageTransition } from '@/app/ui/motion/view-transitions';

import { BridgeContent } from '../../_components/bridge-content';

/*
 * `/home/*` are the app's internal paths (AGENTS.md §6): reserved for it,
 * never a web page. Whoever lands here without the app gets the way to it.
 */
export async function generateMetadata({
  params,
}: PageProps<'/home/[[...rest]]'>): Promise<Metadata> {
  const path = routes.homeBridge((await params).rest);
  const t = await getTranslations('bridges.home');
  return { title: t('metaTitle'), ...smartAppBanner(path) };
}

export default async function HomeBridgePage({
  params,
}: PageProps<'/home/[[...rest]]'>) {
  const path = routes.homeBridge((await params).rest);
  const t = await getTranslations('bridges.home');

  return (
    <PageTransition>
      <BridgeContent
        icon={OpenInNew}
        title={t('title')}
        description={t('description')}
        path={path}
        source="link"
      />
    </PageTransition>
  );
}
