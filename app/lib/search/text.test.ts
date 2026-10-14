import { describe, expect, it } from 'vitest';

import { compareMatches, findMatch, foldText, splitMatch } from './text';

describe('foldText', () => {
  it('drops case, accents and doubled spaces', () => {
    expect(foldText('  Cardiología   Pediátrica ')).toBe(
      'cardiologia pediatrica',
    );
    expect(foldText('MÉDICO')).toBe('medico');
  });
});

describe('findMatch', () => {
  it('finds the typed text whatever its case or accents', () => {
    expect(findMatch('Cardiología', 'cardio')).toEqual({
      start: 0,
      end: 6,
      atWordStart: true,
    });
    expect(findMatch('Médico', 'MEDI')).toEqual({
      start: 0,
      end: 4,
      atWordStart: true,
    });
  });

  it('reports the match on the original text, accents included', () => {
    const match = findMatch('Pediatría y Neonatología', 'neonatologia');
    expect(match).toEqual({ start: 12, end: 24, atWordStart: true });
    expect('Pediatría y Neonatología'.slice(12, 24)).toBe('Neonatología');
  });

  it('prefers a match at the start of a word over one inside', () => {
    // «ología» is inside «Cardiología»; «Oncología» starts with «on» — the
    // word-start match wins even though it comes later.
    expect(findMatch('Cardiología Oncológica', 'on')).toEqual({
      start: 12,
      end: 14,
      atWordStart: true,
    });
  });

  it('takes a match inside a word when there is no other', () => {
    expect(findMatch('Cardiología', 'ología')).toEqual({
      start: 5,
      end: 11,
      atWordStart: false,
    });
  });

  it('answers null for nothing typed or nothing found', () => {
    expect(findMatch('Cardiología', '   ')).toBeNull();
    expect(findMatch('Cardiología', 'derma')).toBeNull();
  });

  it('matches across accented letters typed plainly', () => {
    expect(findMatch('José Pérez', 'jose pe')).toEqual({
      start: 0,
      end: 7,
      atWordStart: true,
    });
  });
});

describe('compareMatches', () => {
  it('puts word-start matches first, then the earlier, then the shorter', () => {
    const list = [
      'Neurocardiología',
      'Cardiología Pediátrica',
      'Cardiología',
    ].flatMap((text) => {
      const match = findMatch(text, 'car');
      return match ? [{ text, match }] : [];
    });
    expect(list).toHaveLength(3);
    expect([...list].sort(compareMatches).map((item) => item.text)).toEqual([
      'Cardiología',
      'Cardiología Pediátrica',
      'Neurocardiología',
    ]);
  });
});

describe('splitMatch', () => {
  it('cuts the text in three around the match', () => {
    expect(
      splitMatch('Cardiología', { start: 0, end: 6, atWordStart: true }),
    ).toEqual({
      before: '',
      matched: 'Cardio',
      after: 'logía',
    });
    expect(splitMatch('Cardiología', null)).toEqual({
      before: 'Cardiología',
      matched: '',
      after: '',
    });
  });
});
