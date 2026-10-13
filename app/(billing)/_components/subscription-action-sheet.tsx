'use client';

import { useId, useState } from 'react';

import Autorenew from '@material-symbols/svg-400/rounded/autorenew.svg?svgr';
import CreditCardOff from '@material-symbols/svg-400/rounded/credit_card_off.svg?svgr';
import DoNotDisturbOn from '@material-symbols/svg-400/rounded/do_not_disturb_on.svg?svgr';
import EventAvailable from '@material-symbols/svg-400/rounded/event_available.svg?svgr';
import ReceiptLong from '@material-symbols/svg-400/rounded/receipt_long.svg?svgr';
import RestartAlt from '@material-symbols/svg-400/rounded/restart_alt.svg?svgr';
import SwapHoriz from '@material-symbols/svg-400/rounded/swap_horiz.svg?svgr';
import Visibility from '@material-symbols/svg-400/rounded/visibility.svg?svgr';
import VisibilityOff from '@material-symbols/svg-400/rounded/visibility_off.svg?svgr';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { track } from '@/app/lib/analytics/track';
import { failureMessageKey } from '@/app/lib/api/errors';
import type { SessionUser } from '@/app/lib/firebase/client';
import { formatDate } from '@/app/lib/format/dates';
import { billingKeys, changeSubscription } from '@/app/lib/queries/billing';
import type {
  CurrentSubscription,
  Subscription,
  SubscriptionAction,
} from '@/app/lib/schemas/billing';
import { cn } from '@/app/lib/utils';

import { Button } from '@/app/ui/button';
import { FieldError } from '@/app/ui/field-error';
import { Icon, type IconComponent } from '@/app/ui/icons';
import { readDuration } from '@/app/ui/motion';
import { Sheet } from '@/app/ui/sheet';
import { toast } from '@/app/ui/toast';

/**
 * What the sheet asks about, taken when it opens: the answer changes the
 * subscription underneath, and the sheet must not change while it slides
 * away.
 */
export type AskedAction = {
  action: SubscriptionAction;
  /** Until when the plan runs, written: the period's end, or when a cancelled one ends. */
  date: string | null;
  plan: string;
  /** The plan a scheduled change goes to. */
  next: string;
};

export function askAbout(
  action: SubscriptionAction,
  subscription: Subscription,
): AskedAction {
  const ends = subscription.endsAt ?? subscription.currentPeriod?.end;
  return {
    action,
    date: ends ? formatDate(ends) : null,
    plan: subscription.plan.name,
    next: subscription.scheduledChange?.plan.name ?? '',
  };
}

type Translate = ReturnType<typeof useTranslations<'billing.actions'>>;

type Consequence = {
  key: string;
  icon: IconComponent;
  text: string;
  /** What is lost, in the error's color. */
  loses?: boolean;
};

/** What changes, point by point (the app's consequences). */
function consequences(t: Translate, asked: AskedAction): Consequence[] {
  switch (asked.action) {
    case 'cancel':
      return [
        {
          key: 'keepsUntil',
          icon: EventAvailable,
          text: asked.date
            ? t('cancel.keepsUntil', { date: asked.date })
            : t('cancel.keepsUntilNoDate'),
        },
        {
          key: 'visibility',
          icon: VisibilityOff,
          text: t('cancel.visibility'),
          loses: true,
        },
        { key: 'noCharge', icon: CreditCardOff, text: t('cancel.noCharge') },
        { key: 'resume', icon: RestartAlt, text: t('cancel.resume') },
      ];
    case 'resume':
      return [
        {
          key: 'renews',
          icon: Autorenew,
          text: asked.date
            ? t('resume.renews', { date: asked.date })
            : t('resume.renewsNoDate'),
        },
        { key: 'visibility', icon: Visibility, text: t('resume.visibility') },
      ];
    case 'abandon':
      return [
        {
          key: 'voids',
          icon: ReceiptLong,
          text: t('abandon.voids'),
          loses: true,
        },
        { key: 'choose', icon: SwapHoriz, text: t('abandon.choose') },
      ];
    case 'undoPlanChange':
      return [
        {
          key: 'stays',
          icon: Autorenew,
          text: t('undoPlanChange.stays', { plan: asked.plan }),
        },
        {
          key: 'noChange',
          icon: DoNotDisturbOn,
          text: t('undoPlanChange.noChange', { next: asked.next }),
        },
      ];
  }
}

const events = {
  cancel: 'web_subscription_canceled',
  resume: 'web_subscription_resumed',
  abandon: 'web_subscription_abandoned',
  undoPlanChange: 'web_subscription_change_undone',
} as const satisfies Record<SubscriptionAction, string>;

type SubscriptionActionSheetProps = {
  user: SessionUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The last action asked: it stays while the sheet closes. */
  asked: AskedAction | null;
};

/*
 * Cancelling, resuming, dropping an unpaid subscription and undoing a
 * scheduled change, confirmed after saying what happens — the app's
 * SubscriptionActionSheet: the title, what changes point by point, and the
 * two buttons. When the action loses something (cancelling, dropping), the
 * way back goes first, so whoever opened it by mistake meets it first.
 */
export function SubscriptionActionSheet({
  user,
  open,
  onOpenChange,
  asked,
}: SubscriptionActionSheetProps) {
  const t = useTranslations('billing.actions');
  const tRoot = useTranslations();
  const queryClient = useQueryClient();
  const failureId = useId();
  // Each opening starts clean: a failure belongs to the opening that asked.
  const [openings, setOpenings] = useState(open ? 1 : 0);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setOpenings((count) => count + 1);
  }
  const run = useMutation({
    mutationFn: ({ action }: { action: SubscriptionAction; opening: number }) =>
      changeSubscription(user, action),
  });

  const action = asked?.action ?? 'cancel';
  const loses = action === 'cancel' || action === 'abandon';
  const failureKey =
    run.error &&
    run.variables.opening === openings &&
    run.variables.action === action
      ? failureMessageKey(run.error, `billing.actions.${action}.failed`)
      : null;

  const confirm = () => {
    if (run.isPending || asked === null) return;
    run.mutate(
      { action: asked.action, opening: openings },
      {
        onSuccess: (subscription) => {
          const settle = () => {
            queryClient.setQueryData<CurrentSubscription>(
              billingKeys.subscription(user.id),
              (cached) => (cached ? { ...cached, subscription } : cached),
            );
            void queryClient.invalidateQueries({
              queryKey: billingKeys.subscription(user.id),
            });
            if (asked.action === 'abandon') {
              // Its receipt was voided.
              void queryClient.invalidateQueries({
                queryKey: billingKeys.payables(user.id),
              });
              void queryClient.invalidateQueries({
                queryKey: billingKeys.invoices(user.id),
              });
            }
          };
          track(events[asked.action], {});
          onOpenChange(false);
          toast(t(`${asked.action}.success`));
          if (asked.action === 'abandon') {
            // Dropped, the page becomes «no plan»: it moves on once the
            // sheet has slid away, never from under it.
            window.setTimeout(settle, readDuration('base') * 1000);
          } else {
            settle();
          }
        },
        onError: () => {
          // The subscription may have moved meanwhile (ERR_5073): read it again.
          void queryClient.invalidateQueries({
            queryKey: billingKeys.subscription(user.id),
          });
        },
      },
    );
  };

  const confirmButton = (
    <Button
      block
      shape="soft"
      variant={loses ? 'error' : 'primary'}
      loading={run.isPending}
      aria-describedby={failureKey ? failureId : undefined}
      onClick={confirm}
    >
      {t(`${action}.confirm`)}
    </Button>
  );
  const keepButton = (
    <Button
      block
      shape="soft"
      variant={loses ? 'primary' : 'white'}
      onClick={() => {
        onOpenChange(false);
      }}
    >
      {t(`${action}.keep`)}
    </Button>
  );

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={
        asked === null
          ? ''
          : action === 'abandon'
            ? t('abandon.title', { plan: asked.plan })
            : action === 'undoPlanChange'
              ? t('undoPlanChange.title', { next: asked.next })
              : t(`${action}.title`)
      }
      footer={
        <div className="flex flex-col gap-3">
          {loses ? keepButton : confirmButton}
          {loses ? confirmButton : keepButton}
        </div>
      }
    >
      {asked === null ? null : (
        <ul className="flex flex-col gap-3 pb-2">
          {consequences(t, asked).map((item) => (
            <li
              key={item.key}
              className={cn(
                'flex items-start gap-3 text-body-md',
                item.loses ? 'text-error-700' : 'text-text-secondary',
              )}
            >
              <Icon
                icon={item.icon}
                size={20}
                className={cn(
                  'mt-0.5 shrink-0',
                  item.loses ? 'text-error-700' : 'text-primary',
                )}
              />
              {item.text}
            </li>
          ))}
        </ul>
      )}
      <FieldError
        id={failureId}
        message={failureKey ? tRoot(failureKey) : undefined}
      />
    </Sheet>
  );
}
