import { act } from '@testing-library/react';
import { vi } from 'vitest';

/*
 * jsdom has no IntersectionObserver: this one lets a test bring what is
 * observed into view — a list's foot, for the infinite scroll — by hand
 * (`enterAll`), or at once on observing it (`inView`). Undone with
 * `vi.unstubAllGlobals()`.
 */

type Observer = {
  callback: IntersectionObserverCallback;
  targets: Set<Element>;
  disconnected: boolean;
};

const live: Observer[] = [];

function entry(target: Element): IntersectionObserverEntry {
  const rect = target.getBoundingClientRect();
  return {
    target,
    isIntersecting: true,
    intersectionRatio: 1,
    boundingClientRect: rect,
    intersectionRect: rect,
    rootBounds: null,
    time: 0,
  };
}

export function stubIntersectionObserver({ inView = false } = {}) {
  live.length = 0;
  class FakeIntersectionObserver {
    readonly root = null;
    readonly rootMargin: string;
    readonly thresholds = [0];
    private readonly state: Observer;

    constructor(
      callback: IntersectionObserverCallback,
      options?: IntersectionObserverInit,
    ) {
      this.rootMargin = options?.rootMargin ?? '0px';
      this.state = { callback, targets: new Set(), disconnected: false };
      live.push(this.state);
    }

    observe(target: Element) {
      this.state.targets.add(target);
      if (inView) {
        queueMicrotask(() => {
          if (this.state.disconnected) return;
          this.state.callback([entry(target)], this);
        });
      }
    }

    unobserve(target: Element) {
      this.state.targets.delete(target);
    }

    disconnect() {
      this.state.disconnected = true;
      this.state.targets.clear();
    }

    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
}

/** Everything observed now comes into view. */
export function enterAll() {
  act(() => {
    for (const observer of [...live]) {
      if (observer.disconnected || observer.targets.size === 0) continue;
      observer.callback(
        [...observer.targets].map(entry),
        {} as IntersectionObserver,
      );
    }
  });
}

/** How many observers are still watching something. */
export function watching(): number {
  return live.filter(
    (observer) => !observer.disconnected && observer.targets.size > 0,
  ).length;
}
