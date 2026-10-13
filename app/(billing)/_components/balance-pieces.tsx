'use client';

import Link from 'next/link';

import ChevronRight from '@material-symbols/svg-400/rounded/chevron_right.svg?svgr';
import NorthEast from '@material-symbols/svg-400/rounded/north_east.svg?svgr';
import SouthWest from '@material-symbols/svg-400/rounded/south_west.svg?svgr';
import { useTranslations } from 'next-intl';

import { formatDate } from '@/app/lib/format/dates';
import { formatBillingAmount } from '@/app/lib/format/money';
import { routes } from '@/app/lib/routes';
import {
  signedMovement,
  type BalanceMovement,
  type Money,
} from '@/app/lib/schemas/billing';
import { cn } from '@/app/lib/utils';

import { Icon } from '@/app/ui/icons';
import { Skeleton } from '@/app/ui/skeleton';

/*
 * The balance's pieces, on «Mi suscripción» and on its own page: how much
 * there is and what it is for, and each movement with what it was.
 */

/** How much balance there is, and what it is for (the app's BalanceSummaryCard). */
export function BalanceSummary({ balance }: { balance: Money }) {
  const t = useTranslations('billing.balance');
  const positive = balance.amount > 0;
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl bg-pure-white p-5 shadow-sm">
      <p
        className={cn(
          'text-subtitle-l font-bold',
          // Green as text on white is the 700, as every green word of the web (AA).
          positive ? 'text-green-700' : 'text-text-primary',
        )}
      >
        {formatBillingAmount(balance)}
      </p>
      <p className="text-body-md text-text-secondary">
        {positive ? t('description') : t('emptyDescription')}
      </p>
    </div>
  );
}

const rowClass =
  'flex animate-fade-in items-center gap-3 rounded-2xl bg-pure-white p-3.5 shadow-sm';

/**
 * A movement of the balance (the app's BalanceMovementTile): what it was,
 * why, when, and how much it added or took. One about a receipt opens it.
 */
export function BalanceMovementRow({
  movement,
}: {
  movement: BalanceMovement;
}) {
  const t = useTranslations('billing.balance');
  const credit = movement.type === 'CREDIT';
  const reason = movement.reason?.trim();
  const date = movement.createdAt ? formatDate(movement.createdAt) : null;

  const content = (
    <>
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full',
          credit
            ? 'bg-success-light text-green-700'
            : 'bg-surface-variant text-text-secondary',
        )}
      >
        <Icon icon={credit ? SouthWest : NorthEast} size={20} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-label-lg text-text-primary">
          {movement.label}
        </span>
        {reason ? (
          <span className="text-body-sm text-text-secondary">{reason}</span>
        ) : null}
        {date ? (
          <span className="text-body-sm text-text-secondary">{date}</span>
        ) : null}
      </span>
      <span
        className={cn(
          'shrink-0 text-label-lg font-bold',
          credit ? 'text-green-700' : 'text-text-primary',
        )}
      >
        {formatBillingAmount(signedMovement(movement), { showPlus: true })}
      </span>
    </>
  );

  if (!movement.invoiceId) {
    return (
      <li>
        <div className={rowClass}>{content}</div>
      </li>
    );
  }
  return (
    <li>
      <Link
        href={routes.subscriptionInvoice(movement.invoiceId)}
        className={cn(
          rowClass,
          'group transition-[translate,box-shadow] duration-base ease-house outline-none hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50',
        )}
      >
        {content}
        <Icon
          icon={ChevronRight}
          size={20}
          label={t('seeReceipt')}
          className="shrink-0 text-grey-500"
        />
      </Link>
    </li>
  );
}

/** A movement's row while it comes. No words, so it fits any scope. */
export function BalanceMovementSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-pure-white p-3.5 shadow-sm">
      <Skeleton className="size-9 rounded-full" />
      <div className="flex flex-1 flex-col gap-1.5">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-4 w-14" />
    </div>
  );
}
