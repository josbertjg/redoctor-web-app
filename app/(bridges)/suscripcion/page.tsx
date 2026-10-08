import type { Metadata } from 'next';

import WorkspacePremium from '@material-symbols/svg-400/rounded/workspace_premium.svg?svgr';
import { getTranslations } from 'next-intl/server';

import { smartAppBanner } from '@/app/lib/app-bridge';
import { routes } from '@/app/lib/routes';

import { BridgeContent } from '../_components/bridge-content';

const path = routes.subscriptionBridge();

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('bridges.subscription');
  return { title: t('metaTitle'), ...smartAppBanner(path) };
}

/*
 * «Mi suscripción»: the «Abrir Redoctor» button of the API's billing emails.
 * The app handles it; the web never renders billing here (AGENTS.md §6).
 */
export default async function SubscriptionBridgePage() {
  const t = await getTranslations('bridges.subscription');

  return (
    <BridgeContent
      icon={WorkspacePremium}
      title={t('title')}
      description={t('description')}
      path={path}
      source="email"
    />
  );
}
