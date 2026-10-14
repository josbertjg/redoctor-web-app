import { describe, expect, it } from 'vitest';

import {
  buildSearchResponse,
  buildSearchResult,
} from '@/tests/factories/search';

import {
  canSuggest,
  matchSpecialties,
  toSpecialistSuggestions,
} from './suggestions';
import { searchResponseSchema } from '../schemas/search';

const catalog = [
  { id: '1', name: 'Medicina' },
  { id: '2', name: 'Cardiología Pediátrica' },
  { id: '3', name: 'Cardiología' },
  { id: '4', name: 'Neurocardiología' },
  { id: '5', name: 'Odontología' },
];

describe('canSuggest', () => {
  it('needs two characters, spaces aside', () => {
    expect(canSuggest(' c ')).toBe(false);
    expect(canSuggest('ca')).toBe(true);
  });
});

describe('matchSpecialties', () => {
  it('offers the best matches first, with the letters that matched', () => {
    const found = matchSpecialties(catalog, 'cardio');
    expect(found.map((item) => item.name)).toEqual([
      'Cardiología',
      'Cardiología Pediátrica',
      'Neurocardiología',
    ]);
    expect(found[0]).toEqual({
      kind: 'specialty',
      id: '3',
      name: 'Cardiología',
      match: { start: 0, end: 6, atWordStart: true },
    });
  });

  it('ignores accents and case, and keeps to the limit', () => {
    expect(matchSpecialties(catalog, 'ODONTOLOGIA')[0]?.name).toBe(
      'Odontología',
    );
    expect(matchSpecialties(catalog, 'ología', 2)).toHaveLength(2);
  });

  it('offers nothing under two characters', () => {
    expect(matchSpecialties(catalog, 'c')).toEqual([]);
  });
});

describe('toSpecialistSuggestions', () => {
  it('shapes the API’s answer as rows with the first specialty', () => {
    const response = searchResponseSchema.parse(
      buildSearchResponse({
        data: [buildSearchResult(), buildSearchResult({ specialties: [] })],
      }),
    );
    const rows = toSpecialistSuggestions(response, 'pér');
    expect(rows[0]).toEqual({
      kind: 'specialist',
      id: 'a0af9566-a53d-4887-8d16-1dfc589c2f3d',
      name: 'Ana Pérez',
      photoUrl: null,
      verified: true,
      specialty: 'Cardióloga',
      match: { start: 4, end: 7, atWordStart: true },
    });
    expect(rows[1]?.specialty).toBeNull();
  });
});
