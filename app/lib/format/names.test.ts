import { describe, expect, it } from 'vitest';

import { initialsOf } from './names';

describe('initialsOf', () => {
  it('takes the first letter of the first two words', () => {
    expect(initialsOf('Josbert Guedez')).toBe('JG');
    expect(initialsOf('  ana  maría pérez ')).toBe('AM');
    expect(initialsOf('Cher')).toBe('C');
    expect(initialsOf('')).toBe('');
  });
});
