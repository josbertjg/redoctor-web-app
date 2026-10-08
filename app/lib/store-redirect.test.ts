import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { scheduleStoreRedirect } from './store-redirect';

const store = 'https://apps.apple.com/app/id1234567890';

function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', {
    value: hidden,
    configurable: true,
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  Reflect.deleteProperty(document, 'hidden');
});

describe('scheduleStoreRedirect', () => {
  it('goes to the store after the pause', () => {
    const navigate = vi.fn();
    scheduleStoreRedirect(store, { navigate });

    vi.advanceTimersByTime(2999);
    expect(navigate).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(navigate).toHaveBeenCalledWith(store);
  });

  it('never fires once cancelled (the person tapped «Abrir en la app»)', () => {
    const navigate = vi.fn();
    const cancel = scheduleStoreRedirect(store, { navigate });

    cancel();
    vi.advanceTimersByTime(5000);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('gives up when the person leaves the page', () => {
    const navigate = vi.fn();
    scheduleStoreRedirect(store, { navigate });

    setHidden(true);
    document.dispatchEvent(new Event('visibilitychange'));
    setHidden(false);
    vi.advanceTimersByTime(5000);
    expect(navigate).not.toHaveBeenCalled();
  });
});
