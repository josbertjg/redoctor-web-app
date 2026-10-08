// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { createNetworkNoticeThrottle } from './network-notice';

describe('createNetworkNoticeThrottle', () => {
  it('shows one notice per interval', () => {
    let now = 0;
    const shouldShow = createNetworkNoticeThrottle(10_000, () => now);

    expect(shouldShow()).toBe(true);
    now = 3_000;
    expect(shouldShow()).toBe(false);
    now = 10_000;
    expect(shouldShow()).toBe(true);
  });
});
