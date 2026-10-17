import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ScreenWipe, wipeScreen } from './screen-wipe';

/*
 * jsdom has no Web Animations: the cover's animation is stubbed, finished at
 * once, and the hole's transition never ends, so the wipe opens on its own
 * timeout. The durations come from the tokens' defaults.
 */

let animations: { cancel: ReturnType<typeof vi.fn> }[] = [];

function stubAnimate() {
  animations = [];
  Object.defineProperty(HTMLElement.prototype, 'animate', {
    configurable: true,
    value: function animate() {
      const animation = { finished: Promise.resolve(), cancel: vi.fn() };
      animations.push(animation);
      return animation;
    },
  });
}

function overlay(container: HTMLElement): HTMLElement {
  const node = container.querySelector<HTMLElement>('.screen-wipe');
  if (!node) throw new Error('No overlay');
  return node;
}

afterEach(() => {
  Reflect.deleteProperty(HTMLElement.prototype, 'animate');
  vi.restoreAllMocks();
});

describe('wipeScreen', () => {
  it('only makes the change when the overlay is not mounted', async () => {
    const change = vi.fn();

    await wipeScreen({ tone: 'success', whileCovered: change });

    expect(change).toHaveBeenCalledTimes(1);
  });

  it('only makes the change under reduced motion', async () => {
    stubAnimate();
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) =>
        ({
          matches: query.includes('reduce'),
          media: query,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
        }) as unknown as MediaQueryList,
    );
    const { container } = render(<ScreenWipe />);
    const change = vi.fn();

    await wipeScreen({ tone: 'primary', whileCovered: change });

    expect(change).toHaveBeenCalledTimes(1);
    expect(animations).toHaveLength(0);
    expect(overlay(container)).not.toBeVisible();
  });

  describe('with the overlay', () => {
    beforeEach(() => {
      stubAnimate();
    });

    it('covers in the tone asked for, changes the page under it, then opens and hides', async () => {
      const { container } = render(<ScreenWipe />);
      const node = overlay(container);
      expect(node).not.toBeVisible();

      let covered: boolean | null = null;
      const wiping = wipeScreen({
        tone: 'success',
        whileCovered: () => {
          covered = !node.hidden;
        },
      });
      expect(node).toBeVisible();
      expect(node).toHaveAttribute('data-tone', 'success');
      expect(node).toHaveAttribute('data-phase', 'covering');

      await wiping;

      expect(covered).toBe(true);
      expect(node).not.toBeVisible();
      expect(node).not.toHaveAttribute('data-phase');
      expect(animations[0]?.cancel).toHaveBeenCalled();
    });

    it('waits for a change that takes a while before it opens', async () => {
      const { container } = render(<ScreenWipe />);
      const node = overlay(container);
      let land: () => void = () => undefined;
      const landing = new Promise<void>((resolve) => {
        land = resolve;
      });

      const wiping = wipeScreen({
        tone: 'primary',
        whileCovered: () => landing,
      });
      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(node).toHaveAttribute('data-phase', 'covering');

      land();
      await wiping;
      expect(node).not.toBeVisible();
    });

    it('opens even when the change fails, and says so', async () => {
      const { container } = render(<ScreenWipe />);
      const node = overlay(container);

      await expect(
        wipeScreen({
          tone: 'primary',
          whileCovered: () => {
            throw new Error('Nothing changed');
          },
        }),
      ).rejects.toThrow('Nothing changed');
      expect(node).not.toBeVisible();
    });

    it('runs a second change at once while one wipe is on screen', async () => {
      render(<ScreenWipe />);
      const second = vi.fn();
      const first = wipeScreen({
        tone: 'primary',
        whileCovered: () => undefined,
      });

      await wipeScreen({ tone: 'success', whileCovered: second });

      expect(second).toHaveBeenCalledTimes(1);
      expect(animations).toHaveLength(1);
      await first;
    });
  });
});
