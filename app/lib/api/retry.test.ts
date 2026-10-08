// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  backoffDelay,
  isReplayable,
  isTransientStatus,
  neverReachedServer,
  retryAfterDelay,
} from './retry';

describe('isReplayable', () => {
  it('replays reads and updates, not creates or deletes', () => {
    expect(isReplayable('GET')).toBe(true);
    expect(isReplayable('PUT')).toBe(true);
    expect(isReplayable('PATCH')).toBe(true);
    expect(isReplayable('POST')).toBe(false);
    expect(isReplayable('DELETE')).toBe(false);
  });

  it('replays a write declared idempotent', () => {
    expect(isReplayable('POST', true)).toBe(true);
  });
});

describe('isTransientStatus', () => {
  it('only 408, 429 and 5xx may change on a retry', () => {
    expect(isTransientStatus(408)).toBe(true);
    expect(isTransientStatus(429)).toBe(true);
    expect(isTransientStatus(503)).toBe(true);
    expect(isTransientStatus(400)).toBe(false);
    expect(isTransientStatus(404)).toBe(false);
    expect(isTransientStatus(409)).toBe(false);
  });
});

describe('neverReachedServer', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const fetchFailure = (code: string) =>
    new TypeError('fetch failed', {
      cause: Object.assign(new Error(code), { code }),
    });

  it('is true when the connection itself failed', () => {
    expect(neverReachedServer(fetchFailure('ECONNREFUSED'))).toBe(true);
    expect(neverReachedServer(fetchFailure('ENOTFOUND'))).toBe(true);
    expect(neverReachedServer(fetchFailure('UND_ERR_CONNECT_TIMEOUT'))).toBe(
      true,
    );
  });

  it('is false when the request may have gone out', () => {
    expect(neverReachedServer(fetchFailure('ECONNRESET'))).toBe(false);
    expect(neverReachedServer(new TypeError('Failed to fetch'))).toBe(false);
  });

  it('is true while the browser is offline', () => {
    vi.stubGlobal('navigator', { onLine: false });
    expect(neverReachedServer(new TypeError('Failed to fetch'))).toBe(true);
  });
});

describe('delays', () => {
  it('backs off exponentially with a little jitter', () => {
    expect(backoffDelay(0, () => 0)).toBe(300);
    expect(backoffDelay(1, () => 0)).toBe(900);
    expect(backoffDelay(1, () => 1)).toBe(1000);
  });

  it('honors Retry-After up to five seconds', () => {
    expect(retryAfterDelay('2')).toBe(2000);
    expect(retryAfterDelay('60')).toBe(5000);
    expect(retryAfterDelay('soon')).toBeUndefined();
    expect(retryAfterDelay(null)).toBeUndefined();
  });
});
