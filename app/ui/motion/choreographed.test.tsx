import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Choreographed, piece } from './choreographed';

import type { AnimationSequence } from 'framer-motion';

/*
 * A choreographed box whose markup lacks some of the pieces its entrance
 * names — the plans' section with no plan to show, a plan with no
 * «Recomendado» tag. Motion throws on a selector that finds nothing
 * (outside production): the box must leave such a piece out instead.
 */

let enter: (() => void) | null = null;

class FakeObserver {
  constructor(private readonly callback: IntersectionObserverCallback) {}
  observe() {
    enter = () => {
      this.callback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      );
    };
  }
  disconnect() {
    enter = null;
  }
}

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', FakeObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
  enter = null;
});

const hidden = {
  [piece('title')]: { opacity: 0 },
  [piece('tag')]: { opacity: 0 },
};
const sequence: AnimationSequence = [
  [piece('title'), { opacity: 1 }, { duration: 0 }],
  [piece('tag'), { opacity: 1 }, { duration: 0 }],
];

describe('Choreographed', () => {
  it('hides and brings in the pieces it holds, and leaves out the ones it does not', async () => {
    render(
      <Choreographed hidden={hidden} sequence={sequence}>
        <h2 data-piece="title">Elige el plan ideal</h2>
      </Choreographed>,
    );
    const title = screen.getByRole('heading', { name: 'Elige el plan ideal' });

    await waitFor(() => {
      expect(title).toHaveStyle({ opacity: '0' });
    });

    act(() => {
      enter?.();
    });
    await waitFor(() => {
      expect(title).toHaveStyle({ opacity: '1' });
    });
  });
});
