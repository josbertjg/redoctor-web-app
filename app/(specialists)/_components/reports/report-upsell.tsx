'use client';

import Link from 'next/link';

import CheckCircleFill from '@material-symbols/svg-400/rounded/check_circle-fill.svg?svgr';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import type { SessionUser } from '@/app/lib/firebase/client';
import { formatDate } from '@/app/lib/format/dates';
import { formatBillingAmount } from '@/app/lib/format/money';
import {
  plansQueryOptions,
  subscriptionQueryOptions,
} from '@/app/lib/queries/billing';
import { routes } from '@/app/lib/routes';
import { featureOffer, type FeatureOffer } from '@/app/lib/schemas/billing';

import { PlanEmblem } from '@/app/ui/billing/plan-emblem';
import { Button } from '@/app/ui/button';
import { Icon } from '@/app/ui/icons';
import { Skeleton } from '@/app/ui/skeleton';

export type DownloadOffer =
  | { status: 'loading' }
  | { status: 'error'; retrying: boolean; retry: () => void }
  | { status: 'ready'; offer: FeatureOffer };

/**
 * The plan that would let the person download their reports, read as soon
 * as the report says theirs does not (`enabled`), so the sheet opens with
 * it: the subscription and the plans on offer, two answers the panel
 * often has already.
 */
export function useDownloadOffer(
  user: SessionUser,
  enabled: boolean,
): DownloadOffer {
  const subscription = useQuery({
    ...subscriptionQueryOptions(user),
    enabled,
  });
  const plans = useQuery({ ...plansQueryOptions(user), enabled });

  if (subscription.isError || plans.isError) {
    return {
      status: 'error',
      retrying: subscription.isFetching || plans.isFetching,
      retry: () => {
        if (subscription.isError) void subscription.refetch();
        if (plans.isError) void plans.refetch();
      },
    };
  }
  if (!subscription.isSuccess || !plans.isSuccess) return { status: 'loading' };
  return {
    status: 'ready',
    offer: featureOffer(
      (plan) => plan.canExportReports,
      plans.data,
      subscription.data.subscription,
    ),
  };
}

/** The sheet's title for an offer: without a plan there is no «tu plan» to speak of. */
export function upsellTitleKey(offer: DownloadOffer) {
  return offer.status === 'ready' && offer.offer.kind === 'subscribe'
    ? ('reports.export.noPlanTitle' as const)
    : ('reports.export.lockedTitle' as const);
}

/** The sheet's line for an offer: which plan downloads, or what comes first. */
export function useUpsellDescription(offer: DownloadOffer): string | undefined {
  const t = useTranslations('reports.export');
  if (offer.status !== 'ready') return undefined;
  const { offer: value } = offer;
  switch (value.kind) {
    case 'upgrade':
      return t('upgradePlanChange', { plan: value.plan.name });
    case 'subscribe':
      return t('contractPlan', { plan: value.plan.name });
    case 'pay':
      return value.owed === 'upgrade'
        ? t('upgradePending', { plan: value.planName })
        : value.owed === 'plan'
          ? t('activatePlan', { plan: value.planName })
          : t('payFirst');
    case 'ending': {
      const date = value.endsAt ? formatDate(value.endsAt) : null;
      return date ? t('ending', { date }) : t('endingNoDate');
    }
    case 'unavailable':
      return t('unavailable');
  }
}

/*
 * Downloading is the plan's (`canExport`, as in the app); the app can only
 * say so, the web may sell (the owner's rule of 2026-10-13): the plan that
 * includes it, with its price, and the way to it — the change to it, the
 * plans with it chosen, or the receipt owed first, since the API changes
 * no plan with debt. The words follow the app's office limit.
 */
export function DownloadUpsell({ offer }: { offer: DownloadOffer }) {
  const t = useTranslations('reports.export');
  const tRoot = useTranslations();

  if (offer.status === 'loading') {
    return (
      <div aria-busy="true" className="flex flex-col gap-3 pb-4">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-12 rounded-xl" />
      </div>
    );
  }

  if (offer.status === 'error') {
    return (
      <div className="flex flex-col gap-3 pb-4">
        <p className="text-body-md text-text-secondary">
          {t('offerLoadError')}
        </p>
        <Button
          shape="soft"
          variant="white"
          loading={offer.retrying}
          onClick={offer.retry}
        >
          {tRoot('retry')}
        </Button>
      </div>
    );
  }

  const { offer: value } = offer;
  switch (value.kind) {
    case 'upgrade':
    case 'subscribe':
      return (
        <div className="flex flex-col gap-4 pb-4">
          <div className="flex animate-fade-up flex-col gap-3 rounded-2xl bg-pure-white p-4 shadow-md">
            <div className="flex items-center gap-3">
              <PlanEmblem slug={value.plan.slug} size="sm" />
              <p className="flex min-w-0 flex-col">
                <span className="text-title-md text-text-primary">
                  {value.plan.name}
                </span>
                <span>
                  <span className="text-subtitle-s font-bold text-text-primary">
                    {formatBillingAmount(value.plan.price.amount)}
                  </span>{' '}
                  <span className="text-body-md text-text-secondary">
                    {t('perMonth')}
                  </span>
                </span>
              </p>
            </div>
            <p className="flex items-start gap-2 text-body-sm text-text-primary">
              <Icon
                icon={CheckCircleFill}
                size={16}
                className="mt-0.5 shrink-0 text-primary"
              />
              {t('includesDownloads')}
            </p>
          </div>
          <Button asChild block shape="soft">
            <Link href={routes.subscriptionPay(value.plan.slug)}>
              {value.kind === 'upgrade'
                ? t('upgradeAction')
                : t('contractAction')}
            </Link>
          </Button>
        </div>
      );
    case 'pay':
      return (
        <div className="pb-4">
          <Button asChild block shape="soft">
            <Link href={routes.subscriptionPay()}>{t('payAction')}</Link>
          </Button>
        </div>
      );
    case 'ending':
    case 'unavailable':
      return null;
  }
}
