import { formatLocale } from '../i18n/config';

/*
 * Money and consultation prices, as the app writes them (its `MoneyFormat`
 * and `PriceText`, AGENTS.md §5): «$ 45», «Desde $ 25», «$ 25 – $ 50» where
 * there is little room, and «Desde $ 25 hasta $ 50 (USD)» with every word.
 * Whole amounts go without decimals, so they never read as made up; the
 * decimals use the locale's comma, as the landing's plans do.
 */

const symbols: Readonly<Record<string, string>> = {
  USD: '$',
  EUR: '€',
  VES: 'Bs.S',
};

const amountFormat = new Intl.NumberFormat(formatLocale, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const centsFormat = new Intl.NumberFormat(formatLocale, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** `$ 15` or `$ 19,99`. */
export function formatMoney(amount: number, currency = 'USD'): string {
  const text = Number.isInteger(amount)
    ? amountFormat.format(amount)
    : centsFormat.format(amount);
  return `${symbols[currency] ?? currency} ${text}`;
}

export type PriceInput = {
  type?: 'FIXED' | 'RANGE' | 'FROM' | null | undefined;
  currency?: string | null | undefined;
  amount?: number | null | undefined;
  minAmount?: number | null | undefined;
  maxAmount?: number | null | undefined;
};

/** The words around the amounts, from the app's `priceFormat.*` keys. */
export type PriceWords = {
  /** «Desde {amount}». */
  from: (amount: string) => string;
  /** «{min} – {max}». */
  rangeShort: (min: string, max: string) => string;
  /** «Desde {min} hasta {max}». */
  range: (min: string, max: string) => string;
};

/**
 * A consultation price in words, or null when the API sent none. A range
 * without a top reads as a «desde», as in the app.
 */
export function formatPrice(
  price: PriceInput | null | undefined,
  words: PriceWords,
  detail: 'compact' | 'detailed' = 'compact',
): string | null {
  if (!price?.type) return null;
  const currency = price.currency ?? 'USD';
  const money = (value: number | null | undefined) =>
    value === null || value === undefined ? null : formatMoney(value, currency);

  let text: string | null;
  switch (price.type) {
    case 'FIXED':
      text = money(price.amount);
      break;
    case 'FROM': {
      const from = money(price.amount ?? price.minAmount);
      text = from === null ? null : words.from(from);
      break;
    }
    case 'RANGE': {
      const min = money(price.minAmount);
      const max = money(price.maxAmount);
      if (min === null) text = null;
      else if (max === null) text = words.from(min);
      else
        text =
          detail === 'compact'
            ? words.rangeShort(min, max)
            : words.range(min, max);
      break;
    }
  }
  if (text === null) return null;
  return detail === 'detailed' ? `${text} (${currency})` : text;
}
