'use client';

import Link from 'next/link';

import ReceiptLong from '@material-symbols/svg-400/rounded/receipt_long.svg?svgr';
import { useTranslations } from 'next-intl';

import { formatPeriod } from '@/app/lib/format/dates';
import { formatBillingAmount } from '@/app/lib/format/money';
import { routes } from '@/app/lib/routes';
import {
  invoiceStatusChips,
  isPayable,
  type Invoice,
} from '@/app/lib/schemas/billing';

import { Icon } from '@/app/ui/icons';
import { Skeleton } from '@/app/ui/skeleton';
import { StateChip } from '@/app/ui/state-chip';

/** «Mensualidad» or «Cambio de plan»: what a receipt is for. */
export function invoiceKindKey(invoice: Pick<Invoice, 'kind'>) {
  return invoice.kind === 'PRORATION'
    ? ('invoices.kind.proration' as const)
    : ('invoices.kind.cycle' as const);
}

/*
 * A receipt in a list (the app's InvoiceTile): what it covers, how much and
 * where it stands — and, when part of it was paid, what is still missing.
 * It opens the receipt.
 */
export function InvoiceCard({ invoice }: { invoice: Invoice }) {
  const t = useTranslations('billing');
  const chip = invoiceStatusChips[invoice.status];
  const period = formatPeriod(invoice.periodStart, invoice.periodEnd);
  const owesPart =
    isPayable(invoice) && invoice.pending.amount < invoice.total.amount;

  return (
    <li>
      <Link
        href={routes.subscriptionInvoice(invoice.id)}
        className="group flex animate-fade-in items-center gap-3 rounded-2xl bg-pure-white p-3.5 shadow-sm transition-[translate,box-shadow] duration-base ease-house outline-none hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-info-light text-primary">
          <Icon icon={ReceiptLong} size={20} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-label-lg text-text-primary">
            {t(invoiceKindKey(invoice))}
          </span>
          {period ? (
            <span className="text-body-sm text-text-secondary">{period}</span>
          ) : null}
          <span className="truncate text-body-sm text-text-secondary">
            {t('invoices.number', { number: invoice.number })}
          </span>
        </span>
        {/* With a ceiling: on a narrow phone the concept keeps its room. */}
        <span className="flex max-w-[42%] shrink-0 flex-col items-end gap-1.5 text-right">
          <span className="text-label-lg font-bold text-text-primary">
            {formatBillingAmount(invoice.total)}
          </span>
          <StateChip tone={chip.tone}>
            {t(`invoices.status.${chip.label}`)}
          </StateChip>
          {owesPart ? (
            <span className="text-body-sm text-warning-800">
              {t('invoices.pendingShort', {
                amount: formatBillingAmount(invoice.pending),
              })}
            </span>
          ) : null}
        </span>
      </Link>
    </li>
  );
}

/** A receipt's row while it comes: its final size. No words, so it fits any scope. */
export function InvoiceCardSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-pure-white p-3.5 shadow-sm">
      <Skeleton className="size-9 rounded-full" />
      <div className="flex flex-1 flex-col gap-1.5">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="flex flex-col items-end gap-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    </div>
  );
}
