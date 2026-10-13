'use client';

import { useState } from 'react';

import AccountBalance from '@material-symbols/svg-400/rounded/account_balance.svg?svgr';
import CheckCircleFill from '@material-symbols/svg-400/rounded/check_circle-fill.svg?svgr';
import ChevronRight from '@material-symbols/svg-400/rounded/chevron_right.svg?svgr';
import Search from '@material-symbols/svg-400/rounded/search.svg?svgr';
import { useTranslations } from 'next-intl';

import {
  bankLabel,
  searchBanks,
  type VenezuelanBank,
} from '@/app/lib/billing/banks';
import { cn } from '@/app/lib/utils';

import { EmptyState } from '@/app/ui/empty-state';
import { Icon } from '@/app/ui/icons';
import { Sheet } from '@/app/ui/sheet';
import { TextField } from '@/app/ui/text-field';

type BankPickerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCode: string | null;
  onPick: (bank: VenezuelanBank) => void;
};

/*
 * The bank the payment came from (the app's PaymentBankPage): the list is
 * long, so it filters as the person types instead of making them scroll it
 * whole. Picking one closes the sheet.
 */
export function BankPicker({
  open,
  onOpenChange,
  selectedCode,
  onPick,
}: BankPickerProps) {
  const t = useTranslations('billing.acquire.bank');
  const [query, setQuery] = useState('');
  const [wasOpen, setWasOpen] = useState(open);
  // Each opening starts from the whole list; cleared on opening, not on
  // closing, so the list does not change while the sheet slides away.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setQuery('');
  }
  const results = searchBanks(query);

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t('title')}>
      <div className="flex flex-col gap-3">
        <TextField
          label={t('search')}
          type="search"
          autoComplete="off"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
          leading={
            <Icon icon={Search} size={20} className="ml-3 text-grey-400" />
          }
        />
        {results.length === 0 ? (
          <EmptyState
            headingLevel={3}
            icon={Search}
            title={t('emptyTitle')}
            description={t('emptyDescription')}
            className="py-6"
          />
        ) : (
          <ul className="flex flex-col divide-y divide-divider">
            {results.map((bank) => {
              const selected = bank.code === selectedCode;
              return (
                <li key={bank.code}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      onPick(bank);
                      onOpenChange(false);
                    }}
                    className="-mx-2 flex min-h-touch w-[calc(100%+--spacing(4))] items-center gap-3 rounded-lg px-2 py-3 text-left transition-colors duration-fast ease-house outline-none hover:bg-white-200 focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <Icon
                      icon={AccountBalance}
                      size={20}
                      className={cn(
                        'shrink-0',
                        selected ? 'text-primary' : 'text-grey-400',
                      )}
                    />
                    <span
                      className={cn(
                        'flex-1 text-body-md text-text-primary',
                        selected && 'font-semibold',
                      )}
                    >
                      {bankLabel(bank)}
                    </span>
                    <Icon
                      icon={selected ? CheckCircleFill : ChevronRight}
                      size={20}
                      className={cn(
                        'shrink-0',
                        selected ? 'text-primary' : 'text-grey-300',
                      )}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Sheet>
  );
}
