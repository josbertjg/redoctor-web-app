import { describe, expect, it } from 'vitest';

import { formatMoney, formatPrice, type PriceWords } from './money';

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
