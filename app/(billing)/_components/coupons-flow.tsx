'use client';

import { useState } from 'react';

import CloudOff from '@material-symbols/svg-400/rounded/cloud_off.svg?svgr';
import ConfirmationNumber from '@material-symbols/svg-400/rounded/confirmation_number.svg?svgr';
import LocalActivity from '@material-symbols/svg-400/rounded/local_activity.svg?svgr';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { track } from '@/app/lib/analytics/track';
import { failureMessageKey } from '@/app/lib/api/errors';
import type { SessionUser } from '@/app/lib/firebase/client';
import { formatDate } from '@/app/lib/format/dates';
import {
  billingKeys,
  couponRejectionKey,
  myCouponsQueryOptions,
  saveCoupon,
} from '@/app/lib/queries/billing';
import { routes } from '@/app/lib/routes';
import {
  couponCodeMaxLength,
  couponCodeMinLength,
  sortSavedCoupons,
  type SavedCoupon,
} from '@/app/lib/schemas/billing';
import { cn } from '@/app/lib/utils';

import { Button } from '@/app/ui/button';
import { EmptyState } from '@/app/ui/empty-state';
import { Icon } from '@/app/ui/icons';
import { Skeleton } from '@/app/ui/skeleton';
import { StateChip } from '@/app/ui/state-chip';
import { TextField } from '@/app/ui/text-field';
import { toast } from '@/app/ui/toast';

import { useSession } from '@/app/hooks/use-session';

import { BackLink } from './back-link';
import { couponSummary } from './coupon-words';

/** A coupon's row while it comes: its final size, no words. */
function CouponCardSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-pure-white p-3.5 shadow-sm">
      <Skeleton className="size-9 rounded-full" />
      <div className="flex flex-1 flex-col gap-1.5">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-48" />
      </div>
    </div>
  );
}

/** «Mis cupones» before it comes: the way back, the title, the form and the rows. No words. */
export function CouponsSkeleton() {
  return (
    <div aria-busy="true" className="flex w-full flex-col gap-4">
      <Skeleton className="h-touch w-36" />
      <Skeleton className="h-8 w-36" />
      <Skeleton className="h-36 rounded-2xl" />
      <div className="flex flex-col gap-3">
        <CouponCardSkeleton />
        <CouponCardSkeleton />
      </div>
    </div>
  );
}

const normalize = (code: string) => code.trim().toUpperCase();

/*
 * `/panel/subscription/coupons` (the app's MyCouponsScreen): the codes the
 * specialist kept to use later and the personal ones Redoctor gave them,
 * which appear by themselves — the ones still to use first. Saving a code
 * spends nothing and reserves no use: it is used when taking a plan or on
 * the plan in force.
 */
export function CouponsFlow() {
  const { user } = useSession();
  if (user === null) return <CouponsSkeleton />;
  return <MyCoupons user={user} />;
}

function MyCoupons({ user }: { user: SessionUser }) {
  const t = useTranslations('billing');
  const tRoot = useTranslations();
  const queryClient = useQueryClient();
  const coupons = useQuery(myCouponsQueryOptions(user));
  const [code, setCode] = useState('');
  /** What is wrong before asking the API: nothing typed, or a length no code has. */
  const [problem, setProblem] = useState<'missing' | 'length' | null>(null);
  const save = useMutation({
    mutationFn: (typed: string) => saveCoupon(user, typed),
  });

  const typed = normalize(code);
  const failureKey =
    save.isError && save.variables === typed
      ? (couponRejectionKey(save.error) ??
        failureMessageKey(save.error, 'billing.myCoupons.failed'))
      : null;
  const fieldError =
    problem === 'missing'
      ? t('acquire.coupon.required')
      : problem === 'length'
        ? t('couponRejection.invalid')
        : failureKey
          ? tRoot(failureKey)
          : undefined;

  const submit = () => {
    if (save.isPending) return;
    if (typed === '') {
      setProblem('missing');
      return;
    }
    // The API takes 3 to 32 characters: a code outside them is no code.
    if (
      typed.length < couponCodeMinLength ||
      typed.length > couponCodeMaxLength
    ) {
      setProblem('length');
      return;
    }
    save.mutate(typed, {
      onSuccess: (saved) => {
        // In the list at once, the ones still to use first; then read again.
        queryClient.setQueryData<SavedCoupon[]>(
          billingKeys.savedCoupons(user.id),
          (cached) =>
            sortSavedCoupons([
              saved,
              ...(cached ?? []).filter(
                (coupon) => coupon.savedCouponId !== saved.savedCouponId,
              ),
            ]),
        );
        void queryClient.invalidateQueries({
          queryKey: billingKeys.savedCoupons(user.id),
        });
        track('web_coupon_saved', {});
        setCode('');
        toast(t('myCoupons.saved'));
      },
    });
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <BackLink
        href={routes.subscription()}
        label={t('mySubscription.title')}
      />
      <h1 className="text-headline-sm text-text-primary">
        {t('myCoupons.title')}
      </h1>

      <form
        noValidate
        className="flex flex-col gap-3 rounded-2xl bg-pure-white p-5 shadow-md"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <p className="text-body-md text-text-secondary">
          {t('myCoupons.saveDescription')}
        </p>
        <TextField
          label={t('manage.coupon.label')}
          placeholder={t('manage.coupon.hint')}
          value={code}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          error={fieldError}
          leading={
            <Icon
              icon={ConfirmationNumber}
              size={20}
              className="ml-3 text-grey-400"
            />
          }
          onChange={(event) => {
            setCode(event.target.value.toUpperCase());
            setProblem(null);
          }}
        />
        <Button type="submit" block shape="soft" loading={save.isPending}>
          {t('myCoupons.save')}
        </Button>
      </form>

      {list()}
    </div>
  );

  function list() {
    if (coupons.isPending) {
      return (
        <div aria-busy="true" className="flex flex-col gap-3">
          <CouponCardSkeleton />
          <CouponCardSkeleton />
        </div>
      );
    }
    // Only when there is nothing to show: a failed re-read keeps the list.
    if (coupons.isLoadingError) {
      return (
        <EmptyState
          tone="error"
          icon={CloudOff}
          title={t('myCoupons.loadErrorTitle')}
          description={t('myCoupons.loadErrorDescription')}
          action={
            <Button
              shape="soft"
              loading={coupons.isFetching}
              onClick={() => {
                void coupons.refetch();
              }}
            >
              {tRoot('retry')}
            </Button>
          }
        />
      );
    }
    if (coupons.data.length === 0) {
      return (
        <EmptyState
          icon={LocalActivity}
          title={t('myCoupons.emptyTitle')}
          description={t('myCoupons.emptyDescription')}
        />
      );
    }
    return (
      <ul aria-label={t('myCoupons.listLabel')} className="flex flex-col gap-3">
        {coupons.data.map((coupon) => (
          <SavedCouponCard key={coupon.savedCouponId} coupon={coupon} />
        ))}
      </ul>
    );
  }
}

/** A coupon of «Mis cupones» (the app's SavedCouponTile): its code, what it takes off and until when. */
function SavedCouponCard({ coupon }: { coupon: SavedCoupon }) {
  const t = useTranslations('billing');
  const available = coupon.state === 'AVAILABLE';
  const expires =
    available && coupon.expiresAt ? formatDate(coupon.expiresAt) : null;
  const state =
    coupon.state === 'USED'
      ? 'used'
      : coupon.state === 'EXPIRED'
        ? 'expired'
        : 'unknown';

  return (
    <li className="flex animate-fade-in items-center gap-3 rounded-2xl bg-pure-white p-3.5 shadow-sm">
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full',
          available
            ? 'bg-success-light text-green-700'
            : 'bg-surface-variant text-text-secondary',
        )}
      >
        <Icon icon={ConfirmationNumber} size={20} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="truncate text-label-lg font-bold text-text-primary">
            {coupon.code}
          </span>
          {coupon.personal ? (
            <span className="shrink-0 text-label-md text-primary">
              {t('myCoupons.personal')}
            </span>
          ) : null}
        </span>
        <span className="text-body-sm text-text-secondary">
          {couponSummary(t, coupon)}
        </span>
        {expires ? (
          <span className="text-body-sm text-text-secondary">
            {t('myCoupons.expiresOn', { date: expires })}
          </span>
        ) : null}
      </span>
      {available ? null : (
        <StateChip tone="neutral">{t(`myCoupons.state.${state}`)}</StateChip>
      )}
    </li>
  );
}
