import { describe, expect, it } from 'vitest';

import {
  formatNationalPhone,
  nationalDigits,
  phoneProblem,
  toInternationalPhone,
} from './phone';

describe('Venezuelan mobile numbers', () => {
  it('reads the number however it is written', () => {
    for (const written of [
      '4141234567',
      '04141234567',
      '0414-123.45.67',
      '+58 414 123 4567',
      '584141234567',
    ]) {
      expect(nationalDigits(written)).toBe('4141234567');
      expect(phoneProblem(written)).toBeNull();
    }
  });

  it('takes every operator', () => {
    for (const code of ['412', '414', '416', '422', '424', '426']) {
      expect(phoneProblem(`${code}1234567`)).toBeNull();
    }
  });

  it('refuses what is not a mobile number', () => {
    expect(phoneProblem('')).toBe('empty');
    expect(phoneProblem('2125551234')).toBe('invalidFormat');
    expect(phoneProblem('4131234567')).toBe('invalidFormat');
    expect(phoneProblem('414123456')).toBe('invalidFormat');
    expect(phoneProblem('41412345678')).toBe('invalidFormat');
  });

  it('writes it for the API and for people', () => {
    expect(toInternationalPhone('0414-123.45.67')).toBe('+584141234567');
    expect(formatNationalPhone('+584227362867')).toBe('0422 736 2867');
    expect(formatNationalPhone('12')).toBe('12');
  });
});
