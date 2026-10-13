// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { bankByCode, bankLabel, searchBanks, venezuelanBanks } from './banks';

describe('venezuelanBanks', () => {
  it('lists the app’s banks, the most used first', () => {
    expect(venezuelanBanks).toHaveLength(27);
    expect(venezuelanBanks[0]?.name).toBe('Banesco');
    expect(new Set(venezuelanBanks.map((bank) => bank.code)).size).toBe(27);
  });

  it('writes a bank as the receipt does', () => {
    expect(bankLabel({ code: '0134', name: 'Banesco' })).toBe('(0134) Banesco');
  });

  it('finds a bank by its name, its code or what it used to be called', () => {
    expect(searchBanks('banesco').map(bankLabel)).toEqual(['(0134) Banesco']);
    expect(searchBanks('0102').map((bank) => bank.name)).toEqual([
      'Banco de Venezuela',
    ]);
    expect(searchBanks('bicentenario').map((bank) => bank.code)).toEqual([
      '0175',
    ]);
    // Accents do not get in the way.
    expect(searchBanks('caroni').map((bank) => bank.name)).toEqual([
      'Banco Caroní',
    ]);
    expect(searchBanks('  ')).toHaveLength(27);
    expect(searchBanks('zzz')).toEqual([]);
  });

  it('answers the bank with a code, if the list has it', () => {
    expect(bankByCode('0105')?.name).toBe('Banco Mercantil');
    expect(bankByCode('9999')).toBeUndefined();
  });
});
