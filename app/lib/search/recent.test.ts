import { beforeEach, describe, expect, it } from 'vitest';

import {
  forgetSearch,
  loadRecentSearches,
  rememberSearch,
  saveRecentSearches,
  type RecentSearch,
} from './recent';

const text = (label: string): RecentSearch => ({ kind: 'text', label });

describe('rememberSearch', () => {
  it('puts the latest first, once, and keeps five at most', () => {
    let list: RecentSearch[] = [];
    for (const label of ['a', 'b', 'c', 'd', 'e', 'f']) {
      list = rememberSearch(list, text(label));
    }
    expect(list.map((entry) => entry.label)).toEqual(['f', 'e', 'd', 'c', 'b']);
    list = rememberSearch(list, text('C'));
    expect(list.map((entry) => entry.label)).toEqual(['C', 'f', 'e', 'd', 'b']);
  });

  it('tells a specialty from a specialist with the same id', () => {
    const list = rememberSearch(
      [{ kind: 'specialty', id: '1', label: 'Cardiología' }],
      { kind: 'specialist', id: '1', label: 'Ana' },
    );
    expect(list).toHaveLength(2);
  });
});

describe('forgetSearch', () => {
  it('drops the one entry', () => {
    expect(forgetSearch([text('a'), text('b')], text('A'))).toEqual([
      text('b'),
    ]);
  });
});

describe('the storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('keeps what is saved and ignores nonsense', () => {
    saveRecentSearches([
      text('ana'),
      { kind: 'specialty', id: '1', label: 'C' },
    ]);
    expect(loadRecentSearches()).toEqual([
      text('ana'),
      { kind: 'specialty', id: '1', label: 'C' },
    ]);

    window.localStorage.setItem(
      'redoctor-recent-searches',
      JSON.stringify([{ kind: 'specialty', label: 'no id' }, 'x', text('ok')]),
    );
    expect(loadRecentSearches()).toEqual([text('ok')]);

    window.localStorage.setItem('redoctor-recent-searches', '{not json');
    expect(loadRecentSearches()).toEqual([]);
  });

  it('removes the key when nothing is left', () => {
    saveRecentSearches([text('ana')]);
    saveRecentSearches([]);
    expect(window.localStorage.getItem('redoctor-recent-searches')).toBeNull();
  });
});
