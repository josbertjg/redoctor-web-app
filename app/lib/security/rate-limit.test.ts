import { beforeEach, describe, expect, it } from 'vitest';

import { allowRequest, requestAddress, resetRateLimits } from './rate-limit';

const limit = { limit: 3, windowMs: 1000 };

beforeEach(() => {
  resetRateLimits();
});

describe('allowRequest', () => {
  it('lets the limit through and refuses the rest until the window closes', () => {
    expect(allowRequest('a', limit, 0)).toBe(true);
    expect(allowRequest('a', limit, 10)).toBe(true);
    expect(allowRequest('a', limit, 20)).toBe(true);
    expect(allowRequest('a', limit, 30)).toBe(false);
    expect(allowRequest('b', limit, 30)).toBe(true);
    expect(allowRequest('a', limit, 1000)).toBe(true);
  });
});

describe('requestAddress', () => {
  it('reads the first forwarded address, or says local', () => {
    expect(
      requestAddress(
        new Headers({ 'x-forwarded-for': '203.0.113.1, 10.0.0.1' }),
      ),
    ).toBe('203.0.113.1');
    expect(requestAddress(new Headers({ 'x-real-ip': '203.0.113.9' }))).toBe(
      '203.0.113.9',
    );
    expect(requestAddress(new Headers())).toBe('local');
  });
});
