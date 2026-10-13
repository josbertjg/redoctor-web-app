import { describe, expect, it } from 'vitest';

import {
  formatBillingAmount,
  formatBolivaresForBank,
  formatMoney,
  formatPrice,
  formatRate,
  parseBolivares,
  type PriceWords,
} from './money';

const words: PriceWords = {
  from: (amount) => `Desde ${amount}`,
  rangeShort: (min, max) => `${min} – ${max}`,
  range: (min, max) => `Desde ${min} hasta ${max}`,
};

describe('formatMoney', () => {
  it('writes whole amounts without decimals and the rest with the comma', () => {
    expect(formatMoney(45)).toBe('$ 45');
    expect(formatMoney(19.99)).toBe('$ 19,99');
    expect(formatMoney(19.5)).toBe('$ 19,50');
    expect(formatMoney(1234)).toBe('$ 1.234');
  });

  it('uses the symbol of the currency', () => {
    expect(formatMoney(15, 'EUR')).toBe('€ 15');
    expect(formatMoney(15, 'VES')).toBe('Bs.S 15');
  });
});

describe('formatPrice', () => {
  it('says each kind of price as the app does', () => {
    expect(formatPrice({ type: 'FIXED', amount: 45 }, words)).toBe('$ 45');
    expect(formatPrice({ type: 'FROM', amount: 25 }, words)).toBe('Desde $ 25');
    expect(
      formatPrice({ type: 'RANGE', minAmount: 25, maxAmount: 50 }, words),
    ).toBe('$ 25 – $ 50');
  });

  it('spells it out with the currency when there is room', () => {
    expect(
      formatPrice(
        { type: 'RANGE', currency: 'USD', minAmount: 25, maxAmount: 50 },
        words,
        'detailed',
      ),
    ).toBe('Desde $ 25 hasta $ 50 (USD)');
    expect(formatPrice({ type: 'FIXED', amount: 45 }, words, 'detailed')).toBe(
      '$ 45 (USD)',
    );
  });

  it('reads a range without a top as a «desde»', () => {
    expect(formatPrice({ type: 'RANGE', minAmount: 25 }, words)).toBe(
      'Desde $ 25',
    );
  });

  it('says nothing when there is no price', () => {
    expect(formatPrice(null, words)).toBeNull();
    expect(formatPrice({ type: null }, words)).toBeNull();
    expect(formatPrice({ type: 'FIXED', amount: null }, words)).toBeNull();
  });
});

describe('formatBillingAmount', () => {
  const usd = (amount: number) => ({ amount, currency: 'USD' });
  const ves = (amount: number) => ({ amount, currency: 'VES' });

  it('writes dollars from cents with the point, whole ones without decimals', () => {
    expect(formatBillingAmount(usd(3000))).toBe('$\u00a030');
    expect(formatBillingAmount(usd(3699))).toBe('$\u00a036.99');
    expect(formatBillingAmount(usd(750))).toBe('$\u00a07.50');
  });

  it('writes bolívares as Venezuela does', () => {
    expect(formatBillingAmount(ves(119839))).toBe('Bs\u00a01.198,39');
    expect(formatBillingAmount(ves(2799064))).toBe('Bs\u00a027.990,64');
    expect(formatBillingAmount(ves(0))).toBe('Bs\u00a00,00');
  });

  it('puts the sign in front', () => {
    expect(formatBillingAmount(usd(-600))).toBe('-\u00a0$\u00a06');
    expect(formatBillingAmount(usd(600), { showPlus: true })).toBe(
      '+\u00a0$\u00a06',
    );
    expect(formatBillingAmount(usd(0), { showPlus: true })).toBe('$\u00a00');
  });
});

describe('bolívares for the bank', () => {
  it('writes the figure as the bank’s app wants it typed', () => {
    expect(formatBolivaresForBank(119839)).toBe('1198,39');
    expect(formatBolivaresForBank(2799064)).toBe('27990,64');
  });

  it('reads the rate as people read it', () => {
    expect(formatRate('39.94633333')).toBe('Bs\u00a039,95');
    expect(formatRate('40.50000000', 4)).toBe('Bs\u00a040,5000');
    expect(formatRate('n/a')).toBe('n/a');
  });

  it('reads what a person types, however they write it', () => {
    expect(parseBolivares('1198,39')).toBe(119839);
    expect(parseBolivares('1.198,39')).toBe(119839);
    expect(parseBolivares('1198.39')).toBe(119839);
    expect(parseBolivares('1,198.39')).toBe(119839);
    expect(parseBolivares('Bs 1.198')).toBe(119800);
    expect(parseBolivares('12,5')).toBe(1250);
    expect(parseBolivares('1000')).toBe(100000);
    expect(parseBolivares('0')).toBe(0);
    expect(parseBolivares('')).toBeNull();
    expect(parseBolivares('abc')).toBeNull();
  });
});
