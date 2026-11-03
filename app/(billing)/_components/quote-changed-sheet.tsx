'use client';

import { useState } from 'react';

import ConfirmationNumber from '@material-symbols/svg-400/rounded/confirmation_number.svg?svgr';
import CurrencyExchange from '@material-symbols/svg-400/rounded/currency_exchange.svg?svgr';
import Payments from '@material-symbols/svg-400/rounded/payments.svg?svgr';
import ReceiptLong from '@material-symbols/svg-400/rounded/receipt_long.svg?svgr';
import Savings from '@material-symbols/svg-400/rounded/savings.svg?svgr';
import Schedule from '@material-symbols/svg-400/rounded/schedule.svg?svgr';
import Sell from '@material-symbols/svg-400/rounded/sell.svg?svgr';
import { useTranslations } from 'next-intl';

import { formatBillingAmount } from '@/app/lib/format/money';
import type { Money, QuoteChangeReason } from '@/app/lib/schemas/billing';

import { Button } from '@/app/ui/button';
import { Icon, type IconComponent } from '@/app/ui/icons';
import { Sheet } from '@/app/ui/sheet';
import { SupportLinks } from '@/app/ui/support/support-links';

import { useSupportChannels } from '@/app/hooks/use-support-channels';

/** What changed since the quote the person saw, and what they now pay. */
export type QuoteChangeNotice = {
  reason: QuoteChangeReason;
  previous: Money;
  current: Money;
  /** Found on coming back to a payment left halfway, not at «Confirmar». */
  fromDraft: boolean;
  /** The quote before asked nothing: there is something to pay now. */
  wasFree: boolean;
};

type QuoteChangedSheetProps = {
  notice: QuoteChangeNotice | null;
  onClose: () => void;
};

const reasonKeys = {
  RATE: 'rate',
  PRICE: 'price',
  COUPON: 'coupon',
  BALANCE: 'balance',
  EXPIRED: 'expired',
} as const satisfies Record<QuoteChangeReason, string>;

const reasonIcons: Record<QuoteChangeReason, IconComponent> = {
  RATE: CurrencyExchange,
  PRICE: Sell,
  COUPON: ConfirmationNumber,
  BALANCE: Savings,
  EXPIRED: Schedule,
};

/*
 * The price changed (the app's QuoteChangedSheet; the owner's decisions of
 * 2026-11-02): nothing was created, the price of today is the one shown,
 * and the person is told what that means for them — a payment already
 * made is reported as it was (the API weighs the rate by its day and an
 * admin reviews it; a different amount is explained before sending), one
 * not made yet is made with the new figure. Support is one tap away.
 */
export function QuoteChangedSheet({ notice, onClose }: QuoteChangedSheetProps) {
  const t = useTranslations('billing.pay.quoteChanged');
  const tRoot = useTranslations();
  const channels = useSupportChannels(tRoot('billing.pay.supportMessage'));
  // What the sheet says, kept while it closes (AGENTS.md §8.2).
  const [shown, setShown] = useState(notice);
  if (notice !== null && notice !== shown) setShown(notice);
  if (shown === null) return null;

  const key = reasonKeys[shown.reason];
  const values = {
    current: formatBillingAmount(shown.current),
    previous: formatBillingAmount(shown.previous),
  };
  const description =
    shown.reason === 'RATE' && !shown.fromDraft
      ? t('rate.beforePayment', values)
      : t(`${key}.description`, values);
  const consequences: { icon: IconComponent; text: string }[] = shown.wasFree
    ? [{ icon: Payments, text: t('payNow') }]
    : shown.fromDraft
      ? [
          { icon: ReceiptLong, text: t('ifPaid') },
          { icon: Payments, text: t('ifNotPaid') },
        ]
      : [{ icon: ReceiptLong, text: t('reportPaid') }];

  return (
    <Sheet
      open={notice !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={
        <span className="flex items-center gap-2">
          <Icon
            icon={reasonIcons[shown.reason]}
            size={24}
            className="shrink-0 text-primary"
          />
          {t(`${key}.title`)}
        </span>
      }
      description={description}
      footer={
        <Button block shape="soft" onClick={onClose}>
          {tRoot('understood')}
        </Button>
      }
    >
      <div className="flex flex-col gap-5 pb-2">
        <ul className="flex flex-col gap-3">
          {consequences.map(({ icon, text }) => (
            <li
              key={text}
              className="flex items-start gap-3 text-body-md text-text-primary"
            >
              <Icon
                icon={icon}
                size={20}
                className="mt-0.5 shrink-0 text-primary"
              />
              {text}
            </li>
          ))}
        </ul>
        {channels.whatsapp.length > 0 || channels.phones.length > 0 ? (
          <div className="flex flex-col gap-3">
            <p className="text-title-sm text-text-primary">
              {tRoot('support.needHelp')}
            </p>
            <SupportLinks
              channels={channels}
              headingLevel={null}
              whatsappVariant="white"
            />
          </div>
        ) : null}
      </div>
    </Sheet>
  );
}
