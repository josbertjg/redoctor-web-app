'use client';

import { useId, useState } from 'react';

import ArrowBack from '@material-symbols/svg-400/rounded/arrow_back.svg?svgr';
import CheckCircleFill from '@material-symbols/svg-400/rounded/check_circle-fill.svg?svgr';
import CloudOff from '@material-symbols/svg-400/rounded/cloud_off.svg?svgr';
import KeyboardArrowDown from '@material-symbols/svg-400/rounded/keyboard_arrow_down.svg?svgr';
import WorkspacePremium from '@material-symbols/svg-400/rounded/workspace_premium.svg?svgr';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import type { SessionUser } from '@/app/lib/firebase/client';
import { formatBillingAmount } from '@/app/lib/format/money';
import { plansQueryOptions } from '@/app/lib/queries/billing';
import type { OfferedPlan } from '@/app/lib/schemas/billing';
import { cn } from '@/app/lib/utils';

import { Button } from '@/app/ui/button';
import { EmptyState } from '@/app/ui/empty-state';
import { Icon } from '@/app/ui/icons';
import { Skeleton } from '@/app/ui/skeleton';

import { planBenefits } from './plan-benefits';

type PlansViewProps = {
  user: SessionUser;
  /** The plan to come chosen (`?plan=`, a slug), when it is on offer. */
  preferredSlug?: string | null;
  onSelect: (plan: OfferedPlan) => void;
  onBack: () => void;
};

/*
 * The plans on offer, to take one (the app's SubscriptionPlansScreen):
 * each card names the plan, its monthly price and what it includes, behind
 * «Ver beneficios»; the one a link asks for, or else the first, comes
 * chosen so the button always has a plan to take, and «Seleccionar plan»
 * goes on to pay. Changing an active plan is the change view's.
 */
export function PlansView({
  user,
  preferredSlug = null,
  onSelect,
  onBack,
}: PlansViewProps) {
  const t = useTranslations('billing');
  const tRoot = useTranslations();
  const plans = useQuery(plansQueryOptions(user));
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const groupName = useId();

  const list = plans.data ?? [];
  const chosen =
    list.find((plan) => plan.id === chosenId) ??
    list.find((plan) => plan.slug === preferredSlug) ??
    list[0] ??
    null;

  return (
    <div className="flex w-full flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex min-h-touch w-fit items-center gap-1 rounded-lg pr-2 text-label-lg text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Icon icon={ArrowBack} size={20} />
        {t('mySubscription.title')}
      </button>
      <header className="flex flex-col gap-2">
        <h1 className="text-headline-sm text-text-primary">
          {t.rich('plans.title', {
            highlight: (chunks) => (
              <span className="text-primary">{chunks}</span>
            ),
          })}
        </h1>
        <p className="text-body-md text-text-secondary">
          {t('plans.subtitle')}
        </p>
      </header>

      {plans.isPending ? (
        <ul aria-busy="true" className="flex flex-col gap-3">
          {[0, 1, 2].map((item) => (
            <li key={item}>
              <Skeleton className="h-36 rounded-2xl" />
            </li>
          ))}
        </ul>
      ) : plans.isError ? (
        <EmptyState
          tone="error"
          icon={CloudOff}
          title={t('plans.loadErrorTitle')}
          description={t('plans.loadErrorDescription')}
          action={
            <Button
              shape="soft"
              loading={plans.isFetching}
              onClick={() => {
                void plans.refetch();
              }}
            >
              {tRoot('retry')}
            </Button>
          }
        />
      ) : list.length === 0 ? (
        <EmptyState
          icon={WorkspacePremium}
          title={t('plans.emptyTitle')}
          description={t('plans.emptyDescription')}
        />
      ) : (
        <>
          <fieldset className="flex flex-col gap-3">
            <legend className="sr-only">{t('plans.listLabel')}</legend>
            {list.map((plan) => {
              const selected = chosen?.id === plan.id;
              const open = expanded[plan.id] ?? false;
              return (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  groupName={groupName}
                  selected={selected}
                  expanded={open}
                  benefits={planBenefits(t, plan)}
                  onSelect={() => {
                    setChosenId(plan.id);
                  }}
                  onToggle={() => {
                    setExpanded((current) => ({
                      ...current,
                      [plan.id]: !open,
                    }));
                  }}
                />
              );
            })}
          </fieldset>
          <Button
            block
            shape="soft"
            onClick={() => {
              if (chosen) onSelect(chosen);
            }}
          >
            {t('plans.select')}
          </Button>
        </>
      )}
    </div>
  );
}

type PlanCardProps = {
  plan: OfferedPlan;
  groupName: string;
  selected: boolean;
  expanded: boolean;
  benefits: readonly string[];
  onSelect: () => void;
  onToggle: () => void;
};

/*
 * One plan: choosing it tints the whole card with the brand blue, as the
 * app does; «Ver beneficios» only unfolds the detail. A native radio
 * carries the choice, so the keyboard and assistive technology get it for
 * free; the toggle sits outside the label, so it never picks the plan.
 */
function PlanCard({
  plan,
  groupName,
  selected,
  expanded,
  benefits,
  onSelect,
  onToggle,
}: PlanCardProps) {
  const t = useTranslations('billing.plans');
  const benefitsId = useId();
  const muted = selected ? 'text-blue-100' : 'text-text-secondary';

  return (
    <div
      className={cn(
        'rounded-2xl p-5 transition-[background-color,color,box-shadow] duration-base ease-house has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
        selected
          ? 'bg-primary text-on-primary'
          : 'bg-pure-white text-text-primary shadow-md',
      )}
    >
      <label className="flex cursor-pointer flex-col gap-1">
        <input
          type="radio"
          name={groupName}
          value={plan.id}
          checked={selected}
          onChange={onSelect}
          className="sr-only"
        />
        <span className="text-title-md">{plan.name}</span>
        <span>
          <span className="text-subtitle-l font-bold">
            {formatBillingAmount(plan.price.amount)}
          </span>{' '}
          <span className={cn('text-body-md', muted)}>{t('perMonth')}</span>
        </span>
        {plan.description ? (
          <span className={cn('text-body-sm', muted)}>{plan.description}</span>
        ) : null}
      </label>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={benefitsId}
        onClick={onToggle}
        className="mt-2 -ml-2 inline-flex min-h-touch items-center gap-1 rounded-lg px-2 text-label-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {t(expanded ? 'hideBenefits' : 'seeBenefits')}
        <Icon
          icon={KeyboardArrowDown}
          size={20}
          className={cn(
            'transition-transform duration-base ease-house',
            expanded && 'rotate-180',
          )}
        />
      </button>
      <div
        id={benefitsId}
        aria-hidden={!expanded}
        className={cn(
          'grid transition-[grid-template-rows] duration-base ease-house',
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <p className="pt-2 text-label-md">{t('benefitsTitle')}</p>
          <ul className="mt-1 flex flex-col gap-1.5">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2 text-body-sm">
                <Icon
                  icon={CheckCircleFill}
                  size={16}
                  className={cn(
                    'mt-0.5 shrink-0',
                    selected ? 'text-on-primary' : 'text-primary',
                  )}
                />
                {benefit}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
