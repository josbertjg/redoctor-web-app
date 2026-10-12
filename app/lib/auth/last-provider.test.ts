import { afterEach, describe, expect, it } from 'vitest';

import {
  orderProviders,
  readLastProvider,
  rememberLastProvider,
} from './last-provider';

describe('last provider', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('remembers a provider and ignores anything else in storage', () => {
    expect(readLastProvider()).toBeNull();

    rememberLastProvider('apple');
    expect(readLastProvider()).toBe('apple');

    window.localStorage.setItem('redoctor-last-provider', 'facebook');
    expect(readLastProvider()).toBeNull();
  });

  it('puts the last-used provider first, else Apple on Apple devices', () => {
    expect(orderProviders('google', true)).toEqual(['google', 'apple']);
    expect(orderProviders('apple', false)).toEqual(['apple', 'google']);
    expect(orderProviders(null, true)).toEqual(['apple', 'google']);
    expect(orderProviders(null, false)).toEqual(['google', 'apple']);
  });
});
