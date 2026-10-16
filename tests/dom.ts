/*
 * What jsdom lacks and the libraries call, in place before React loads
 * (tests/setup.ts imports React; this file runs first, vitest.config.mts).
 *
 * - `AnimationEvent`: react-dom decides at load time which animation event
 *   names it listens to, and without the constructor it takes the
 *   WebKit-prefixed ones; a component's `onAnimationEnd` would never hear
 *   the `animationend` a test fires.
 * - Pointer capture: Sonner and Radix call it on a pointer down, and jsdom
 *   has no pointer events of its own.
 */

if (typeof window !== 'undefined') {
  if (!('AnimationEvent' in window)) {
    class AnimationEventStub extends Event {
      readonly animationName: string;
      readonly elapsedTime: number;
      readonly pseudoElement: string;

      constructor(type: string, init: AnimationEventInit = {}) {
        super(type, init);
        this.animationName = init.animationName ?? '';
        this.elapsedTime = init.elapsedTime ?? 0;
        this.pseudoElement = init.pseudoElement ?? '';
      }
    }
    Object.defineProperty(window, 'AnimationEvent', {
      value: AnimationEventStub,
      configurable: true,
      writable: true,
    });
  }

  if (typeof Element !== 'undefined') {
    const prototype = Element.prototype as Partial<Element>;
    prototype.setPointerCapture ??= () => undefined;
    prototype.releasePointerCapture ??= () => undefined;
    prototype.hasPointerCapture ??= () => false;
  }
}
