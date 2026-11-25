import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  loadActiveSearch,
  saveActiveSearch,
  type ActiveSearch,
} from './active-search';

beforeEach(() => {
  window.localStorage.clear();
});

describe('activeSearch', () => {
  it('keeps and reads back an active text search', () => {
    const entry: ActiveSearch = { kind: 'text', text: 'Medicina' };
    saveActiveSearch(entry);
    expect(loadActiveSearch()).toEqual(entry);
  });

  it('keeps and reads back an active specialty search', () => {
    const entry: ActiveSearch = {
      kind: 'specialty',
      id: 'a0000000-0000-4000-8000-000000000001',
      name: 'Cardiología',
    };
    saveActiveSearch(entry);
    expect(loadActiveSearch()).toEqual(entry);
  });

  it('clears the active search when given null', () => {
    saveActiveSearch({ kind: 'text', text: 'Medicina' });
    saveActiveSearch(null);
    expect(loadActiveSearch()).toBeNull();
  });

  it('ignores malformed values and storage failures', () => {
    window.localStorage.setItem('redoctor-active-search', '{broken');
    expect(loadActiveSearch()).toBeNull();

    window.localStorage.setItem(
      'redoctor-active-search',
      JSON.stringify({ kind: 'text', text: '' }),
    );
    expect(loadActiveSearch()).toBeNull();

    window.localStorage.setItem(
      'redoctor-active-search',
      JSON.stringify({ kind: 'specialty', id: '', name: 'Medicina' }),
    );
    expect(loadActiveSearch()).toBeNull();

    const getSpy = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('blocked');
      });
    expect(loadActiveSearch()).toBeNull();
    getSpy.mockRestore();
  });
});
