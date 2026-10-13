import { describe, expect, it } from 'vitest';

import { cleanPersonName, initialsOf, personNameProblem } from './names';

describe('initialsOf', () => {
  it('takes the first letter of the first two words', () => {
    expect(initialsOf('Josbert Guedez')).toBe('JG');
    expect(initialsOf('  ana  maría pérez ')).toBe('AM');
    expect(initialsOf('Cher')).toBe('C');
    expect(initialsOf('')).toBe('');
  });
});

describe('person names', () => {
  it('accepts the names the API accepts', () => {
    for (const name of [
      'Ana',
      'Li',
      'María José',
      'Pérez-Gil',
      "D'Ambrosio",
      'D’Ambrosio',
      '  Núñez  ',
    ]) {
      expect(personNameProblem(name)).toBeNull();
    }
  });

  it('says what is wrong with the rest', () => {
    expect(personNameProblem('')).toBe('empty');
    expect(personNameProblem('   ')).toBe('empty');
    expect(personNameProblem('Ana2')).toBe('invalidFormat');
    expect(personNameProblem('Ana!')).toBe('invalidFormat');
    expect(personNameProblem('-Ana')).toBe('invalidFormat');
    expect(personNameProblem('a'.repeat(101))).toBe('maxLength');
  });

  it('cleans what it sends', () => {
    expect(cleanPersonName('  María   José ')).toBe('María José');
    expect(cleanPersonName('D’Ambrosio')).toBe("D'Ambrosio");
  });
});

describe('names as people type and paste them', () => {
  it('takes a pasted name whose accents come as separate marks', () => {
    const decomposed = 'José';
    expect(cleanPersonName(decomposed)).toBe('José');
    expect(personNameProblem(decomposed)).toBeNull();
  });

  it('leaves the title out of the initials', () => {
    expect(initialsOf('Dra. María González')).toBe('MG');
    expect(initialsOf('Dr José Pérez')).toBe('JP');
    expect(initialsOf('Dra.')).toBe('D');
  });
});
