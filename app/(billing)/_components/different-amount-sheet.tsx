'use client';

import HourglassBottom from '@material-symbols/svg-400/rounded/hourglass_bottom.svg?svgr';
import Savings from '@material-symbols/svg-400/rounded/savings.svg?svgr';
import { useTranslations } from 'next-intl';

import { formatBillingAmount } from '@/app/lib/format/money';
import type { Money } from '@/app/lib/schemas/billing';

import { Button } from '@/app/ui/button';
import { Icon } from '@/app/ui/icons';
import { Sheet } from '@/app/ui/sheet';

type DifferentAmountSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** What the receipt asked for, in bolívares. */
  expected: Money;
  /** Céntimos the person says they paid. */
  reported: number;
  onSend: () => void;
};

/*
 * Before sending an amount other than the one asked: what happens with the
 * difference (the app's _DifferentAmountSheet). The API accepts it: what is
 * missing stays pending on the receipt, what is over becomes balance.
 */
export function DifferentAmountSheet({
  open,
  onOpenChange,
  expected,
  reported,
  onSend,
}: DifferentAmountSheetProps) {
  const t = useTranslations('billing.pay.differentAmount');
  const less = reported < expected.amount;

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t('title')}
      description={t('description', {
        reported: formatBillingAmount({ amount: reported, currency: 'VES' }),
        expected: formatBillingAmount(expected),
      })}
      footer={
        <div className="flex flex-col gap-2">
          <Button
            variant="white"
            block
            shape="soft"
            onClick={() => {
              onOpenChange(false);
            }}
          >
            {t('fix')}
          </Button>
          <Button
            block
            shape="soft"
            onClick={() => {
              onOpenChange(false);
              onSend();
            }}
          >
            {t('send')}
          </Button>
        </div>
      }
    >
      <p className="flex items-start gap-3 rounded-lg bg-warning-50 p-3 text-body-md text-text-primary">
        <Icon
          icon={less ? HourglassBottom : Savings}
          size={24}
          className="shrink-0 text-warning-700"
        />
        {t(less ? 'less' : 'more')}
      </p>
    </Sheet>
  );
}
