import { afterEach, describe, expect, it, vi } from 'vitest';

import { announceNavigation, nextNavigation } from './navigation-events';

afterEach(() => {
  vi.useRealTimers();
});

describe('nextNavigation', () => {
  it('resolves when the next navigation lands', async () => {
    const landed = nextNavigation(1000);

    announceNavigation();

    await expect(landed).resolves.toBe(true);
  });

  it('gives up once the time is over, and forgets the wait', async () => {
    vi.useFakeTimers();
    const landed = nextNavigation(500);

    vi.advanceTimersByTime(500);

    await expect(landed).resolves.toBe(false);
    // A navigation afterwards reaches nobody: nothing throws, nothing waits.
    expect(() => {
      announceNavigation();
    }).not.toThrow();
  });

  it('tells every wait at once', async () => {
    const first = nextNavigation(1000);
    const second = nextNavigation(1000);

    announceNavigation();

    await expect(Promise.all([first, second])).resolves.toEqual([true, true]);
  });
});
