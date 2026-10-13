import type { ReactNode } from 'react';

import { cn } from '@/app/lib/utils';

export type DetailItem = {
  key: string;
  label: ReactNode;
  value: ReactNode;
  /** Beside the value: a copy button. */
  action?: ReactNode;
  /** The figure the person is looking for (a total), heavier than the rest. */
  strong?: boolean;
};

/*
 * Label and value rows of a breakdown inside a card, the app's
 * SubscriptionInfoRow and DetailRow: the value leads, so it takes the room
 * and aligns right; the label has a ceiling and wraps instead of pushing a
 * date or an account number onto a second line.
 */
export function DetailList({
  items,
  className,
}: {
  items: readonly DetailItem[];
  className?: string;
}) {
  return (
    <dl className={cn('flex flex-col divide-y divide-divider', className)}>
      {items.map((item) => (
        <div
          key={item.key}
          className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
        >
          <dt
            className={cn(
              'max-w-[65%] text-body-md text-text-secondary',
              item.strong && 'font-semibold text-text-primary',
            )}
          >
            {item.label}
          </dt>
          <dd
            className={cn(
              'flex min-w-0 items-center justify-end gap-1 text-right text-body-md font-medium text-text-primary',
              item.strong && 'text-label-lg font-bold',
            )}
          >
            <span className="min-w-0 break-words">{item.value}</span>
            {item.action}
          </dd>
        </div>
      ))}
    </dl>
  );
}
