'use client';

import { useState } from 'react';

import ConfirmationNumber from '@material-symbols/svg-400/rounded/confirmation_number.svg?svgr';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { track } from '@/app/lib/analytics/track';
import { failureMessageKey } from '@/app/lib/api/errors';
import type { SessionUser } from '@/app/lib/firebase/client';
import { formatBillingAmount } from '@/app/lib/format/money';
import {
  applyCoupon,
  billingKeys,
  couponRejectionKey,
  savedCouponsQueryOptions,
  validateCoupon,
} from '@/app/lib/queries/billing';
import {
  type Coupon,
  couponAppliesTo,
  type CouponChoice,
  couponCodeMaxLength,
  couponCodeMinLength,
  couponDiscount,
  type SavedCoupon,
  type Subscription,
} from '@/app/lib/schemas/billing';

import { Button } from '@/app/ui/button';
import { Icon } from '@/app/ui/icons';
import { Sheet } from '@/app/ui/sheet';
import { TextField } from '@/app/ui/text-field';
import { toast } from '@/app/ui/toast';

import { CouponPreview, SavedCouponsPicker } from './coupon-pieces';
import { couponSummary } from './coupon-words';

type ApplyCouponSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: SessionUser;
  /** Active, with no coupon discounting it. */
  subscription: Subscription;
};

/** What was seen and not applied yet. */
type Preview = { code: string; coupon: Coupon; choice: CouponChoice };

const normalize = (code: string) => code.trim().toUpperCase();

/*
 * «Aplicar un cupón» to the plan in force (the app's
 * ApplyDiscountBottomSheet): **see** the discount first, which spends
 * nothing — the monthly price it would leave —, then **apply** it, which
 * uses the coupon and discounts from the next monthly receipt. One at a
 * time. Under the field, the saved coupons good for this plan.
 */
export function ApplyCouponSheet({
  open,
  onOpenChange,
  user,
  subscription,
}: ApplyCouponSheetProps) {
  const t = useTranslations('billing');
  const tRoot = useTranslations();
  const queryClient = useQueryClient();
  const planId = subscription.plan.id;
  const [code, setCode] = useState('');
  /** What is wrong before asking the API: nothing typed, or a length no code has. */
  const [problem, setProblem] = useState<'missing' | 'length' | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  // Each opening starts clean — done on opening, so nothing changes while
  // it slides away —, and a failure belongs to the opening that asked.
  const [openings, setOpenings] = useState(open ? 1 : 0);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setOpenings((count) => count + 1);
      setCode('');
      setProblem(null);
      setPreview(null);
    }
  }
  const saved = useQuery({ ...savedCouponsQueryOptions(user), enabled: open });

  const validate = useMutation({
    mutationFn: async ({
      code: typed,
      savedCoupon,
    }: {
      code: string;
      savedCoupon?: SavedCoupon;
      opening: number;
    }): Promise<Preview> => {
      const clean = normalize(typed);
      const coupon = await validateCoupon(user, clean, planId);
      return {
        code: clean,
        coupon,
        choice: savedCoupon
          ? { savedCouponId: savedCoupon.savedCouponId }
          : { code: clean },
      };
    },
    onSuccess: setPreview,
  });
  const apply = useMutation({
    mutationFn: ({ seen }: { seen: Preview; opening: number }) =>
      applyCoupon(user, { choice: seen.choice, code: seen.code }),
  });

  const typed = normalize(code);
  const current = preview?.code === typed ? preview : null;
  const applicable =
    current && couponAppliesTo(current.coupon, planId) ? current : null;

  // A failure belongs to the code it was about, and to this opening.
  const validateFailed =
    validate.isError &&
    validate.variables.opening === openings &&
    normalize(validate.variables.code) === typed;
  const applyFailed =
    apply.isError &&
    apply.variables.opening === openings &&
    apply.variables.seen.code === typed &&
    applicable !== null;
  const failureKey = validateFailed
    ? (couponRejectionKey(validate.error) ??
      failureMessageKey(validate.error, 'billing.acquire.coupon.failed'))
    : applyFailed
      ? (couponRejectionKey(apply.error) ??
        failureMessageKey(apply.error, 'billing.manage.coupon.failed'))
      : null;
  // Read in the field, not in a toast that would cover the keyboard.
  const fieldError =
    problem === 'missing'
      ? t('acquire.coupon.required')
      : problem === 'length'
        ? t('couponRejection.invalid')
        : failureKey
          ? tRoot(failureKey)
          : current && !applicable
            ? t('couponRejection.wrongPlan')
            : undefined;

  const busy = validate.isPending || apply.isPending;

  const see = (candidate: string, savedCoupon?: SavedCoupon) => {
    if (busy) return;
    if (candidate === '') {
      setProblem('missing');
      return;
    }
    // The API takes 3 to 32 characters: a code outside them is no code.
    if (
      candidate.length < couponCodeMinLength ||
      candidate.length > couponCodeMaxLength
    ) {
      setProblem('length');
      return;
    }
    validate.mutate({
      code: candidate,
      opening: openings,
      ...(savedCoupon ? { savedCoupon } : {}),
    });
  };

  const use = () => {
    if (busy || applicable === null) return;
    apply.mutate(
      { seen: applicable, opening: openings },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({
            queryKey: billingKeys.subscription(user.id),
          });
          // A saved one is used now.
          void queryClient.invalidateQueries({
            queryKey: billingKeys.savedCoupons(user.id),
          });
          track('web_subscription_coupon_applied', {
            saved: 'savedCouponId' in applicable.choice,
          });
          onOpenChange(false);
          toast(t('manage.coupon.success'));
        },
        onError: () => {
          // One may be discounting already (ERR_5106): read the plan again.
          void queryClient.invalidateQueries({
            queryKey: billingKeys.subscription(user.id),
          });
        },
      },
    );
  };

  const savedForPlan = (saved.data ?? []).filter((coupon) =>
    couponAppliesTo(coupon, planId),
  );

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t('manage.coupon.title')}
      description={t('manage.coupon.description')}
      footer={
        <Button
          block
          shape="soft"
          loading={busy}
          onClick={() => {
            if (applicable) use();
            else see(typed);
          }}
        >
          {applicable ? t('manage.coupon.apply') : t('manage.coupon.validate')}
        </Button>
      }
    >
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (applicable) use();
          else see(typed);
        }}
      >
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
        {applicable ? (
          <CouponPreview
            summary={couponSummary(t, applicable.coupon)}
            amount={t('coupon.preview.amount', {
              amount: formatBillingAmount({
                amount:
                  subscription.price.amount -
                  couponDiscount(applicable.coupon, subscription.price).amount,
                currency: subscription.price.currency,
              }),
            })}
            note={t('manage.coupon.previewNote')}
          />
        ) : null}
        <SavedCouponsPicker
          coupons={savedForPlan}
          onPick={(coupon) => {
            if (busy) return;
            setCode(coupon.code);
            setProblem(null);
            see(coupon.code, coupon);
          }}
        />
      </form>
    </Sheet>
  );
}
