'use client';

import { useId, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { track } from '@/app/lib/analytics/track';
import { failureMessageKey } from '@/app/lib/api/errors';
import type { SessionUser } from '@/app/lib/firebase/client';
import { billingKeys, undoScheduledChange } from '@/app/lib/queries/billing';
import type {
  CurrentSubscription,
  Subscription,
} from '@/app/lib/schemas/billing';
import { cn } from '@/app/lib/utils';

import { Button } from '@/app/ui/button';
import { FieldError } from '@/app/ui/field-error';
import { Sheet } from '@/app/ui/sheet';
import { toast } from '@/app/ui/toast';

/** What the sheet asks about, kept while it closes: the answer clears it underneath. */
type Asked = { plan: string; next: string };

/*
 * «Anular el cambio de plan» (the app's undo on «Mi suscripción»): a
 * downgrade scheduled for the period's end is dropped after a sheet that
 * says what stays and what does not, and the plan renews as it is. The
 * entry fades out once nothing is scheduled.
 */
export function UndoPlanChange({
  user,
  subscription,
}: {
  user: SessionUser;
  subscription: Subscription;
}) {
  const t = useTranslations('billing.actions.undoPlanChange');
  const tRoot = useTranslations();
  const queryClient = useQueryClient();
  const failureId = useId();
  const [open, setOpen] = useState(false);
  const [asked, setAsked] = useState<Asked | null>(null);
  const undo = useMutation({ mutationFn: () => undoScheduledChange(user) });

  const scheduled = subscription.scheduledChange;
  const failureKey = undo.error
    ? failureMessageKey(undo.error, 'billing.actions.undoPlanChange.failed')
    : null;

  const confirm = () => {
    if (undo.isPending) return;
    undo.mutate(undefined, {
      onSuccess: (renewed) => {
        queryClient.setQueryData<CurrentSubscription>(
          billingKeys.subscription(user.id),
          (cached) => (cached ? { ...cached, subscription: renewed } : cached),
        );
        void queryClient.invalidateQueries({
          queryKey: billingKeys.subscription(user.id),
        });
        track('web_subscription_change_undone', {});
        setOpen(false);
        toast(t('success'));
      },
      onError: () => {
        // The subscription may have moved meanwhile (ERR_5073): read it again.
        void queryClient.invalidateQueries({
          queryKey: billingKeys.subscription(user.id),
        });
      },
    });
  };

  return (
    <div
      aria-hidden={scheduled ? undefined : true}
      inert={!scheduled}
      className={cn(
        'grid transition-[grid-template-rows,opacity] duration-base ease-house',
        scheduled ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
      )}
    >
      <div className="min-h-0">
        <Button
          block
          variant="white"
          shape="soft"
          tabIndex={scheduled ? undefined : -1}
          onClick={() => {
            if (!scheduled) return;
            undo.reset();
            setAsked({
              plan: subscription.plan.name,
              next: scheduled.plan.name,
            });
            setOpen(true);
          }}
        >
          {t('entry')}
        </Button>
      </div>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title={t('title', { next: asked?.next ?? '' })}
        footer={
          <div className="flex flex-col gap-3">
            <Button
              block
              shape="soft"
              loading={undo.isPending}
              aria-describedby={failureKey ? failureId : undefined}
              onClick={confirm}
            >
              {t('confirm')}
            </Button>
            <Button
              block
              variant="white"
              shape="soft"
              onClick={() => {
                setOpen(false);
              }}
            >
              {t('keep')}
            </Button>
          </div>
        }
      >
        <ul className="flex list-disc flex-col gap-2 pb-2 pl-5 text-body-md text-text-secondary">
          <li>{t('stays', { plan: asked?.plan ?? '' })}</li>
          <li>{t('noChange', { next: asked?.next ?? '' })}</li>
        </ul>
        <FieldError
          id={failureId}
          message={failureKey ? tRoot(failureKey) : undefined}
        />
      </Sheet>
    </div>
  );
}
