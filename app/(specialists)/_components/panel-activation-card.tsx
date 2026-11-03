'use client';

import Link from 'next/link';

import ErrorIcon from '@material-symbols/svg-400/rounded/error.svg?svgr';
import Schedule from '@material-symbols/svg-400/rounded/schedule.svg?svgr';
import { useTranslations } from 'next-intl';

import { routes } from '@/app/lib/routes';

import { Icon } from '@/app/ui/icons';

import type { ActivationReading } from './use-profile-activation';

/** The app's short words for each step («Falta un paso: …»). */
const stepShort = {
  identity: 'identity',
  credentials: 'credentials',
  office: 'office',
  schedules: 'schedules',
  pricing: 'pricing',
  subscription: 'subscription',
} as const;

/*
 * How far the profile is from the patients' search, as the app's home card
 * tells it: whose turn it is, «Tu cuenta está al N %» with its bar, and the
 * next step — or, while Redoctor reviews, what can be set meanwhile. The
 * whole card leads to «Mi perfil», where the state is told in full (the
 * app opens its sheet).
 */
export function PanelActivationCard({
  reading,
}: {
  reading: ActivationReading;
}) {
  const t = useTranslations('profile.activation');
  const { activation, onlyInactiveOffices, setupTasks, resolving } = reading;
  const reviewing = activation.tone === 'underReview';
  const step = activation.currentStep;
  const short =
    step === null
      ? null
      : step === 'office' && onlyInactiveOffices
        ? t('steps.activateOffice.short')
        : t(`steps.${stepShort[step]}.short`);

  return (
    <Link
      href={routes.specialistProfile()}
      className="group flex animate-fade-up flex-col gap-4 rounded-xl bg-pure-white px-6 py-6 shadow-md transition-[translate,box-shadow] duration-base ease-house outline-none hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-3 focus-visible:ring-white-50/70 sm:px-7"
    >
      <span className="flex flex-col gap-1.5">
        <span className="flex items-center gap-1.5 text-label-md text-grey-500">
          <Icon icon={reviewing ? Schedule : ErrorIcon} size={16} />
          {reviewing ? t('cardLabelWaiting') : t('cardLabelUrgent')}
        </span>
        <span className="text-subtitle-l font-semibold text-text-primary">
          {t('cardTitle', { percent: activation.progressPercent })}
        </span>
      </span>
      <span
        aria-hidden="true"
        className="block h-6 w-full overflow-hidden rounded-full bg-white-300"
      >
        <span
          className="block h-full rounded-full bg-green-500 transition-[width] duration-slow ease-house"
          style={{ width: `${String(activation.progressPercent)}%` }}
        />
      </span>
      {reviewing ? (
        <span className="flex flex-col gap-2 text-body-lg text-grey-700">
          <span>
            <span className="font-semibold">{t('meanwhile.cardPrefix')}</span>{' '}
            {setupTasks.length > 0 || resolving
              ? t('meanwhile.cardHint')
              : t('meanwhile.allSet.cardDone')}
          </span>
          {setupTasks.length > 0 ? (
            <span className="flex flex-wrap gap-2">
              {setupTasks.map((task) => (
                <span
                  key={task}
                  className="rounded-full bg-blue-50 px-3 py-1 text-label-md text-primary"
                >
                  {t(`meanwhile.tasks.${task}.label`)}
                </span>
              ))}
            </span>
          ) : null}
        </span>
      ) : short === null ? null : (
        <span className="text-subtitle-s text-grey-700">
          <span className="font-semibold">
            {activation.pendingStepCount === 1
              ? t('onePendingStep')
              : t('manyPendingSteps', { count: activation.pendingStepCount })}
          </span>{' '}
          {short}
        </span>
      )}
    </Link>
  );
}
