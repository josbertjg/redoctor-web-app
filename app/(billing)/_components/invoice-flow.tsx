'use client';

import { useId, type ReactNode } from 'react';

import Link from 'next/link';

import CheckCircle from '@material-symbols/svg-400/rounded/check_circle.svg?svgr';
import CloudOff from '@material-symbols/svg-400/rounded/cloud_off.svg?svgr';
import History from '@material-symbols/svg-400/rounded/history.svg?svgr';
import Person from '@material-symbols/svg-400/rounded/person.svg?svgr';
import ReceiptLong from '@material-symbols/svg-400/rounded/receipt_long.svg?svgr';
import SearchOff from '@material-symbols/svg-400/rounded/search_off.svg?svgr';
import Tune from '@material-symbols/svg-400/rounded/tune.svg?svgr';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { isApiError } from '@/app/lib/api/errors';
import { bankByCode, bankLabel } from '@/app/lib/billing/banks';
import type { SessionUser } from '@/app/lib/firebase/client';
import {
  formatCalendarDate,
  formatDate,
  formatPeriod,
} from '@/app/lib/format/dates';
import { formatBillingAmount, formatRate } from '@/app/lib/format/money';
import { invoiceQueryOptions } from '@/app/lib/queries/billing';
import { routes } from '@/app/lib/routes';
import {
  billingDocument,
  canPayInvoice,
  intentStatusChips,
  invoiceStatusChips,
  type InvoiceDetail,
  type Money,
  type PaymentIntent,
} from '@/app/lib/schemas/billing';

import { Button } from '@/app/ui/button';
import { EmptyState } from '@/app/ui/empty-state';
import { Icon, type IconComponent } from '@/app/ui/icons';
import { Skeleton } from '@/app/ui/skeleton';
import { StateChip } from '@/app/ui/state-chip';

import { useSession } from '@/app/hooks/use-session';

import { BackLink } from './back-link';
import { DetailList, type DetailItem } from './detail-list';
import { invoiceKindKey } from './invoice-card';

/** The receipt before it comes: the way back, the title and its cards. No words. */
export function InvoiceSkeleton() {
  return (
    <div aria-busy="true" className="flex w-full flex-col gap-4">
      <Skeleton className="h-touch w-28" />
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-44 rounded-2xl" />
      <Skeleton className="h-56 rounded-2xl" />
      <Skeleton className="h-28 rounded-2xl" />
    </div>
  );
}

/*
 * `/panel/subscription/invoices/{id}` (the app's InvoiceDetailScreen): one
 * receipt with everything that happened on it — what it covers and how
 * the amount owed is reached, the payments applied and what they were in
 * bolívares, the payments reported with how they ended, the adjustments,
 * whom it is issued to — and «Pagar ahora» while something is owed and no
 * payment waits for an admin. An internal receipt, not a fiscal document:
 * the API's notice closes it as it comes.
 */
export function InvoiceFlow({ invoiceId }: { invoiceId: string | null }) {
  const { user } = useSession();
  if (user === null) return <InvoiceSkeleton />;
  // An id no receipt could have: nothing to ask the API.
  if (invoiceId === null) return <ReceiptNotFound />;
  return <Receipt user={user} invoiceId={invoiceId} />;
}

/** The receipt's head: the way back to the list, and its title. */
function ReceiptHead() {
  const t = useTranslations('billing');
  return (
    <>
      <BackLink
        href={routes.subscriptionInvoices()}
        label={t('invoices.title')}
      />
      <h1 className="text-headline-sm text-text-primary">
        {t('invoices.detailTitle')}
      </h1>
    </>
  );
}

/** A link to a receipt that is not there: said in place, with the way to the list. */
function ReceiptNotFound() {
  const t = useTranslations('billing');
  return (
    <div className="flex w-full flex-col gap-4">
      <ReceiptHead />
      <EmptyState
        icon={SearchOff}
        title={t('invoices.notFoundTitle')}
        description={t('invoices.notFoundDescription')}
        action={
          <Button asChild shape="soft">
            <Link href={routes.subscriptionInvoices()}>
              {t('invoices.backToList')}
            </Link>
          </Button>
        }
      />
    </div>
  );
}

function Receipt({
  user,
  invoiceId,
}: {
  user: SessionUser;
  invoiceId: string;
}) {
  const t = useTranslations('billing');
  const tRoot = useTranslations();
  const invoice = useQuery(invoiceQueryOptions(user, invoiceId));
  const head = <ReceiptHead />;

  if (invoice.isPending) return <InvoiceSkeleton />;

  // Only when there is nothing to show: a failed re-read keeps the receipt.
  if (invoice.isLoadingError) {
    const missing =
      isApiError(invoice.error) &&
      (invoice.error.status === 404 || invoice.error.status === 400);
    if (missing) return <ReceiptNotFound />;
    return (
      <div className="flex w-full flex-col gap-4">
        {head}
        <EmptyState
          tone="error"
          icon={CloudOff}
          title={t('invoices.loadErrorTitle')}
          description={t('invoices.loadErrorDescription')}
          action={
            <Button
              shape="soft"
              loading={invoice.isFetching}
              onClick={() => {
                void invoice.refetch();
              }}
            >
              {tRoot('retry')}
            </Button>
          }
        />
      </div>
    );
  }

  const detail = invoice.data;
  const reported = detail.intents.filter((intent) => intent.reported != null);

  return (
    <div className="flex w-full animate-fade-up flex-col gap-4">
      {head}
      <Header invoice={detail} />
      <Concepts invoice={detail} />
      {detail.allocations.length > 0 ? <Allocations invoice={detail} /> : null}
      {reported.length > 0 ? <Reported intents={reported} /> : null}
      {detail.adjustments.length > 0 ? <Adjustments invoice={detail} /> : null}
      <BilledTo invoice={detail} />
      {detail.notice?.trim() ? (
        <p className="text-center text-body-sm text-text-secondary">
          {detail.notice}
        </p>
      ) : null}
      {canPayInvoice(detail) ? (
        <Button asChild block shape="soft" className="animate-fade-in">
          <Link href={routes.subscriptionPayInvoice(detail.id)}>
            {t('notice.payAction')}
          </Link>
        </Button>
      ) : null}
    </div>
  );
}

/** A card of the receipt (the app's SubscriptionSectionCard): its icon, its title, its rows. */
function ReceiptCard({
  icon,
  title,
  aside,
  children,
}: {
  icon?: IconComponent;
  title: string;
  /** Beside the title: the status. */
  aside?: ReactNode;
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-4 rounded-2xl bg-pure-white p-5 shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <h2
          id={headingId}
          className="flex items-center gap-2 text-title-md text-text-primary"
        >
          {icon ? (
            <Icon icon={icon} size={24} className="shrink-0 text-primary" />
          ) : null}
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Header({ invoice }: { invoice: InvoiceDetail }) {
  const t = useTranslations('billing');
  const chip = invoiceStatusChips[invoice.status];
  const period = formatPeriod(invoice.periodStart, invoice.periodEnd);
  const dueAt = invoice.dueAt ? formatDate(invoice.dueAt) : null;
  const paidAt = invoice.paidAt ? formatDate(invoice.paidAt) : null;
  const rows: DetailItem[] = [
    {
      key: 'period',
      label: t('invoices.period'),
      value: period ?? t('missing'),
    },
  ];
  if (dueAt)
    rows.push({ key: 'dueAt', label: t('invoices.dueAt'), value: dueAt });
  if (paidAt) {
    rows.push({ key: 'paidAt', label: t('invoices.paidAt'), value: paidAt });
  }

  return (
    <ReceiptCard
      icon={ReceiptLong}
      title={t('invoices.number', { number: invoice.number })}
      aside={
        <StateChip tone={chip.tone}>
          {t(`invoices.status.${chip.label}`)}
        </StateChip>
      }
    >
      <p className="text-body-md font-medium text-text-primary">
        {t(invoiceKindKey(invoice))}
      </p>
      <DetailList items={rows} />
    </ReceiptCard>
  );
}

/** What was taken off, written as taken off. */
const minus = (money: Money): Money => ({
  amount: -money.amount,
  currency: money.currency,
});

/** The receipt's lines and how the amount owed is reached. */
function Concepts({ invoice }: { invoice: InvoiceDetail }) {
  const t = useTranslations('billing.invoices');
  const owes = invoice.pending.amount > 0;
  const rows: DetailItem[] = invoice.lines.map((line, index) => ({
    key: `line-${String(index)}`,
    label: line.description,
    value: formatBillingAmount(line.amount),
  }));
  rows.push({
    key: 'total',
    label: t('total'),
    value: formatBillingAmount(invoice.total),
    strong: true,
  });
  if (invoice.credited.amount > 0) {
    rows.push({
      key: 'credited',
      label: t('credited'),
      value: formatBillingAmount(minus(invoice.credited)),
    });
  }
  if (invoice.balanceApplied.amount > 0) {
    rows.push({
      key: 'balanceApplied',
      label: t('balanceApplied'),
      value: formatBillingAmount(minus(invoice.balanceApplied)),
    });
  }
  if (invoice.paid.amount > 0) {
    rows.push({
      key: 'paid',
      label: t('paid'),
      value: formatBillingAmount(minus(invoice.paid)),
    });
  }
  rows.push({
    key: 'pending',
    label: t('pending'),
    value: (
      <span className={owes ? 'text-warning-800' : 'text-green-700'}>
        {formatBillingAmount(invoice.pending)}
      </span>
    ),
    strong: true,
  });

  return (
    <ReceiptCard title={t('concepts')}>
      <DetailList items={rows} />
    </ReceiptCard>
  );
}

/** The payments an admin approved, with what they were in bolívares. */
function Allocations({ invoice }: { invoice: InvoiceDetail }) {
  const t = useTranslations('billing');
  return (
    <ReceiptCard icon={CheckCircle} title={t('invoices.allocations')}>
      <DetailList
        items={invoice.allocations.map((allocation) => ({
          key: allocation.paymentId,
          label:
            (allocation.confirmedAt
              ? formatDate(allocation.confirmedAt)
              : null) ?? t('missing'),
          value: t('invoices.allocationValue', {
            usd: formatBillingAmount(allocation.amount),
            ves: formatBillingAmount(allocation.paymentAmountVes),
            rate: formatRate(allocation.rate),
          }),
        }))}
      />
    </ReceiptCard>
  );
}

/** Each time the person reported a payment: what they said, and how it ended. */
function Reported({ intents }: { intents: readonly PaymentIntent[] }) {
  const t = useTranslations('billing');
  return (
    <ReceiptCard icon={History} title={t('invoices.intents')}>
      <ul className="flex flex-col divide-y divide-divider">
        {intents.map((intent) => (
          <ReportedPayment key={intent.id} intent={intent} />
        ))}
      </ul>
    </ReceiptCard>
  );
}

function ReportedPayment({ intent }: { intent: PaymentIntent }) {
  const t = useTranslations('billing');
  const chip = intentStatusChips[intent.status];
  const reported = intent.reported;
  if (!reported) return null;
  const bank = bankByCode(reported.bankCode);
  const reason = intent.status === 'FAILED' ? intent.failureReason?.trim() : '';

  return (
    <li className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between gap-3">
        <p className="text-body-md font-medium text-text-primary">
          {t(
            intent.method === 'MOBILE_PAYMENT'
              ? 'acquire.methods.mobile'
              : 'acquire.methods.transfer',
          )}
        </p>
        <StateChip tone={chip.tone}>
          {t(`pay.intentStatus.${chip.label}`)}
        </StateChip>
      </div>
      <DetailList
        items={[
          {
            key: 'amount',
            label: t('acquire.fields.amount'),
            value: formatBillingAmount(reported.amount),
          },
          {
            key: 'reference',
            label: t('acquire.fields.reference'),
            value: reported.reference.trim()
              ? reported.reference
              : t('missing'),
          },
          {
            key: 'bank',
            label: t('acquire.fields.usedBank'),
            value: bank
              ? bankLabel(bank)
              : reported.bankCode.trim()
                ? reported.bankCode
                : t('missing'),
          },
          {
            key: 'date',
            label: t('acquire.fields.date'),
            value: formatCalendarDate(reported.paidOn),
          },
        ]}
      />
      {reason ? (
        <div className="rounded-lg bg-error-light p-3">
          <p className="text-label-md text-error-800">{t('notice.reason')}</p>
          <p className="mt-1 text-body-md whitespace-pre-line text-error-800">
            {reason}
          </p>
        </div>
      ) : null}
    </li>
  );
}

/** What admins took off, with their reasons. */
function Adjustments({ invoice }: { invoice: InvoiceDetail }) {
  const t = useTranslations('billing.invoices');
  return (
    <ReceiptCard icon={Tune} title={t('adjustments')}>
      <ul className="flex flex-col divide-y divide-divider">
        {invoice.adjustments.map((adjustment) => (
          <li
            key={adjustment.number}
            className="flex flex-col gap-1 py-2.5 first:pt-0 last:pb-0"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="max-w-[65%] text-body-md text-text-secondary">
                {adjustment.label}
              </span>
              <span className="text-right text-body-md font-medium text-text-primary">
                {formatBillingAmount(minus(adjustment.amount))}
              </span>
            </div>
            {adjustment.reason?.trim() ? (
              <p className="text-body-sm text-text-secondary">
                {adjustment.reason}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </ReceiptCard>
  );
}

/** Whom the receipt is issued to. */
function BilledTo({ invoice }: { invoice: InvoiceDetail }) {
  const t = useTranslations('billing');
  const data = invoice.billingData;
  return (
    <ReceiptCard icon={Person} title={t('invoices.billedTo')}>
      <DetailList
        items={[
          {
            key: 'name',
            label: t('invoices.legalName'),
            value: data?.legalName.trim() ? data.legalName : t('missing'),
          },
          {
            key: 'document',
            label: t('acquire.fields.document'),
            value: (data ? billingDocument(data) : null) ?? t('missing'),
          },
        ]}
      />
    </ReceiptCard>
  );
}
