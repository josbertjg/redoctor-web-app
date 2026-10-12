import type { Metadata } from 'next';

import { notFound } from 'next/navigation';

import CalendarMonth from '@material-symbols/svg-400/rounded/calendar_month.svg?svgr';
import { getTranslations } from 'next-intl/server';

import { smartAppBanner } from '@/app/lib/app-bridge';
import { routes } from '@/app/lib/routes';

import { BridgeContent } from '../../../_components/bridge-content';

/*
 * `/panel/agenda` opens today and `/panel/agenda/{YYYY-MM-DD}` that day: the
 * «Ver mi agenda» button of the API's daily summary. The day travels to the
 * app as it came; the app opens today when it is malformed. Deeper paths are
 * not links the app knows.
 */
function agendaPath(date: string[] | undefined) {
  if (date === undefined) return routes.agendaBridge();
  const [day, ...rest] = date;
  if (day === undefined || rest.length > 0) notFound();
  return routes.agendaBridge(day);
}

export async function generateMetadata({
  params,
}: PageProps<'/panel/agenda/[[...date]]'>): Promise<Metadata> {
  const path = agendaPath((await params).date);
  const t = await getTranslations('bridges.agenda');
  return { title: t('metaTitle'), ...smartAppBanner(path) };
}

export default async function AgendaBridgePage({
  params,
}: PageProps<'/panel/agenda/[[...date]]'>) {
  const path = agendaPath((await params).date);
  const t = await getTranslations('bridges.agenda');

  return (
    <BridgeContent
      icon={CalendarMonth}
      title={t('title')}
      description={t('description')}
      path={path}
      source="email"
    />
  );
}
