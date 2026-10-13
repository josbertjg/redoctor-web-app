'use client';

import { useState } from 'react';

import ConfirmationNumber from '@material-symbols/svg-400/rounded/confirmation_number.svg?svgr';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { failureMessageKey } from '@/app/lib/api/errors';
import type { SessionUser } from '@/app/lib/firebase/client';
import { formatBillingAmount } from '@/app/lib/format/money';
import {
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
  type OfferedPlan,
  type SavedCoupon,
} from '@/app/lib/schemas/billing';

import { Button } from '@/app/ui/button';
import { Icon } from '@/app/ui/icons';
import { Sheet } from '@/app/ui/sheet';
import { TextField } from '@/app/ui/text-field';

import { CouponPreview, SavedCouponsPicker } from './coupon-pieces';
import { couponSummary } from './coupon-words';

import type { AppliedCoupon } from './payment-types';

type CouponSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: SessionUser;
  plan: OfferedPlan;
  applied: AppliedCoupon | null;
  onApply: (coupon: AppliedCoupon) => void;
  onRemove: () => void;
};

/** What was validated and not applied yet. */
type Preview = { code: string; coupon: Coupon; choice: CouponChoice };

const normalize = (code: string) => code.trim().toUpperCase();

/*
 * The coupon before taking a plan (the app's CouponBottomSheet): two steps,
 * **see** the discount, which only computes, and **apply**, which puts it
 * in the totals. Neither spends the code: it travels later, inside the
 * subscription. Under the field, the saved coupons good for this plan,
 * so they need not be typed.
 */
export function CouponSheet({
  open,
  onOpenChange,
  user,
  plan,
  applied,
  onApply,
  onRemove,
}: CouponSheetProps) {
  const t = useTranslations('billing');
  const tRoot = useTranslations();
  const [code, setCode] = useState(applied?.terms.code ?? '');
  /** What is wrong before asking the API: nothing typed, or a length no code has. */
  const [problem, setProblem] = useState<'missing' | 'length' | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [wasOpen, setWasOpen] = useState(open);

  // Each opening starts from what is applied: a preview not applied, or a
  // coupon the API dropped meanwhile, is forgotten. Done on opening, not on
  // closing, so the sheet does not change while it slides away.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setPreview(null);
      setProblem(null);
      setCode(applied?.terms.code ?? '');
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
    }): Promise<Preview> => {
      const clean = normalize(typed);
      const coupon = await validateCoupon(user, clean, plan.id);
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

  const typed = normalize(code);
  // What the typed code stands for: its preview, or the applied coupon when it is it.
  const current: Pick<Preview, 'coupon' | 'choice'> | null =
    typed === ''
      ? null
      : preview?.code === typed
        ? preview
        : applied?.terms.code === typed
          ? { coupon: applied.terms, choice: applied.choice }
          : null;
  const applicable =
    current && couponAppliesTo(current.coupon, plan.id) ? current : null;

  const failedCode = validate.isError
    ? normalize(validate.variables.code)
    : null;
  const failureKey =
    failedCode === typed
      ? (couponRejectionKey(validate.error) ??
        failureMessageKey(validate.error, 'billing.acquire.coupon.failed'))
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

  const close = () => {
    onOpenChange(false);
  };
  const lengthIsPossible = (candidate: string) =>
    candidate.length >= couponCodeMinLength &&
    candidate.length <= couponCodeMaxLength;

  const action: { label: string; run: () => void } =
    typed === '' && applied
      ? {
          label: t('acquire.coupon.remove'),
          run: () => {
            onRemove();
            close();
          },
        }
      : applicable && applied?.terms.code !== applicable.coupon.code
        ? {
            label: t('acquire.coupon.apply'),
            run: () => {
              onApply({ choice: applicable.choice, terms: applicable.coupon });
              close();
            },
          }
        : applicable
          ? { label: t('acquire.coupon.keep'), run: close }
          : {
              label: t('acquire.coupon.validate'),
              run: () => {
                if (validate.isPending) return;
                if (typed === '') {
                  setProblem('missing');
                  return;
                }
                // The API takes 3 to 32 characters: a code outside them is no
                // code, and asking would only answer «try again».
                if (!lengthIsPossible(typed)) {
                  setProblem('length');
                  return;
                }
                validate.mutate({ code: typed });
              },
            };

  const savedForPlan = (saved.data ?? []).filter((coupon) =>
    couponAppliesTo(coupon, plan.id),
  );

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t('acquire.coupon.title')}
      footer={
        <Button
          block
          shape="soft"
          loading={validate.isPending}
          onClick={action.run}
        >
          {action.label}
        </Button>
      }
    >
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          action.run();
        }}
      >
        <TextField
          label={t('acquire.coupon.label')}
          placeholder={t('acquire.coupon.hint')}
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
                  plan.price.amount.amount -
                  couponDiscount(applicable.coupon, plan.price.amount).amount,
                currency: plan.price.amount.currency,
              }),
            })}
          />
        ) : null}
        <SavedCouponsPicker
          coupons={savedForPlan}
          onPick={(coupon) => {
            // One at a time, as the app: a tap while another is being
            // checked would answer for the wrong code.
            if (validate.isPending) return;
            setCode(coupon.code);
            setProblem(null);
            validate.mutate({ code: coupon.code, savedCoupon: coupon });
          }}
        />
      </form>
    </Sheet>
  );
}
