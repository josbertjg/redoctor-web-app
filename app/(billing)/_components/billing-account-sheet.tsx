'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import type { SessionUser } from '@/app/lib/firebase/client';
import { billingAccountQueryOptions } from '@/app/lib/queries/billing';
import { billingDocument } from '@/app/lib/schemas/billing';

import { Button } from '@/app/ui/button';
import { Sheet } from '@/app/ui/sheet';
import { Skeleton } from '@/app/ui/skeleton';
import { SupportLinks } from '@/app/ui/support/support-links';

import { useSupportChannels } from '@/app/hooks/use-support-channels';

import { DetailList } from './detail-list';

type BillingAccountSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: SessionUser;
};

/*
 * «Datos de cobro» (the app's BillingAccountSheet): whom the receipts are
 * issued to. Only read: an admin changes it, so the way out is support —
 * WhatsApp with a message that says nothing about the person (it passes
 * through wa.me), or a call.
 */
export function BillingAccountSheet({
  open,
  onOpenChange,
  user,
}: BillingAccountSheetProps) {
  const t = useTranslations('billing');
  const tRoot = useTranslations();
  const account = useQuery({
    ...billingAccountQueryOptions(user),
    enabled: open,
  });
  const channels = useSupportChannels(t('account.whatsappMessage'));
  /** A blank datum shows the app's dashes: no row is left empty. */
  const orMissing = (value: string | null | undefined) =>
    value?.trim() ? value : t('missing');

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t('account.title')}>
      <div className="flex flex-col gap-5 pb-2">
        {content()}
        <SupportLinks
          channels={channels}
          headingLevel={null}
          whatsappVariant="white"
        />
      </div>
    </Sheet>
  );

  function content() {
    if (account.data) {
      const data = account.data;
      return (
        <div className="flex animate-fade-in flex-col gap-4">
          <p className="text-body-md text-text-secondary">
            {data.status === 'CLOSED' ? t('account.closed') : t('account.note')}
          </p>
          <DetailList
            items={[
              {
                key: 'name',
                label: t('account.name'),
                value: orMissing(data.legalName),
              },
              {
                key: 'document',
                label: t('account.document'),
                value: orMissing(billingDocument(data)),
              },
              {
                key: 'email',
                label: t('account.email'),
                value: orMissing(data.email),
              },
            ]}
          />
        </div>
      );
    }
    if (account.isError) {
      return (
        <div className="flex animate-fade-in flex-col items-start gap-3">
          <p className="text-body-md text-text-secondary">
            {t('account.loadError')}
          </p>
          <Button
            variant="white"
            size="small"
            shape="soft"
            loading={account.isFetching}
            onClick={() => {
              void account.refetch();
            }}
          >
            {tRoot('retry')}
          </Button>
        </div>
      );
    }
    return (
      <div aria-busy="true" className="flex flex-col gap-4">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-5 w-3/4" />
      </div>
    );
  }
}
