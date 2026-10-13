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

/* ---------- Billing (M13): the app's `MoneyFormat` ------------------------ */

/** The symbol never ends a line with the figure on the next. */
const nbsp = '\u00a0';

const bolivaresFormat = new Intl.NumberFormat(formatLocale, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const bankFigureFormat = new Intl.NumberFormat(formatLocale, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: false,
});

const billingDollarsFormat = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const wholeBillingDollarsFormat = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
});

export type BillingAmount = { amount: number; currency: string };

/**
 * A billing amount, an integer in cents or céntimos, as the app and the
 * billing emails write it: `$ 36.99` with the point (`$ 15` when whole) and
 * `Bs 1.498,09` as Venezuela writes bolívares, the sign in front when
 * negative, a plus when `showPlus` and positive (a movement that adds).
 */
export function formatBillingAmount(
  money: BillingAmount,
  { showPlus = false }: { showPlus?: boolean } = {},
): string {
  const sign =
    money.amount < 0
      ? `-${nbsp}`
      : showPlus && money.amount > 0
        ? `+${nbsp}`
        : '';
  const value = Math.abs(money.amount) / 100;
  if (money.currency === 'VES') {
    return `${sign}Bs${nbsp}${bolivaresFormat.format(value)}`;
  }
  const text = Number.isInteger(value)
    ? wholeBillingDollarsFormat.format(value)
    : billingDollarsFormat.format(value);
  return `${sign}${symbols[money.currency] ?? money.currency}${nbsp}${text}`;
}

/** `1198,39`: the figure as the bank's app wants it typed, no symbol, no thousands. */
export function formatBolivaresForBank(cents: number): string {
  return bankFigureFormat.format(cents / 100);
}

/** The API's rate (`"40.50000000"`) as it reads: `Bs 40,50`. */
export function formatRate(rate: string, decimals = 2): string {
  const value = Number(rate);
  if (rate.trim() === '' || !Number.isFinite(value)) return rate;
  const format = new Intl.NumberFormat(formatLocale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `Bs${nbsp}${format.format(value)}`;
}

/**
 * Céntimos from an amount as a person types it — «1.198,39», «1198,39» or
 * «1198.39» — or null when it is not an amount. Up to two digits after the
 * last separator are the céntimos; three are a thousands group.
 */
export function parseBolivares(text: string): number | null {
  const cleaned = text.replace(/[^\d.,]/g, '');
  if (cleaned === '') return null;
  const lastSeparator = Math.max(
    cleaned.lastIndexOf(','),
    cleaned.lastIndexOf('.'),
  );
  let whole = cleaned;
  let fraction = '';
  if (lastSeparator >= 0) {
    const tail = cleaned.slice(lastSeparator + 1);
    if (/^\d{1,2}$/.test(tail)) {
      whole = cleaned.slice(0, lastSeparator);
      fraction = tail;
    }
  }
  whole = whole.replace(/[.,]/g, '');
  if (!/^\d+$/.test(whole)) return null;
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(cents) ? cents : null;
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
