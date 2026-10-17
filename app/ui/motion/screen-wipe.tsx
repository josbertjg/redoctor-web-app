'use client';

import { useEffect, useRef } from 'react';

import {
  readDuration,
  readEase,
  type DurationToken,
  type EaseToken,
} from './tokens';

/**
 * `primary` (blue) to come in or go out — signing in, signing out —;
 * `success` (green, the app's colour for it) for what went well.
 */
export type WipeTone = 'primary' | 'success';

type WipeOptions = {
  tone: WipeTone;
  /**
   * Where the circle grows from: the control that was pressed. Without one,
   * the focused control, else the middle of the screen.
   */
  from?: Element | null;
  /**
   * What changes under the colour — a step's state, a navigation (with
   * `nextNavigation`, to open once it lands), data read again. The wipe
   * opens once it is done and the page has painted. Nothing else the
   * moment changes may reach the screen before the colour does: the
   * control pressed stays busy until the page moves on, and a session that
   * arrives on its own is held (AGENTS.md §8, rule 13).
   */
  whileCovered: () => unknown;
};

/** However long the change under it takes, the screen opens after this. */
const MAX_COVER_MS = 8000;

let overlay: HTMLDivElement | null = null;
let running = false;

const ms = (token: DurationToken) => readDuration(token) * 1000;
const curve = (token: EaseToken) =>
  `cubic-bezier(${readEase(token).join(', ')})`;
const wait = (duration: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, duration);
  });
/** Two frames: the change under the colour has painted. */
const nextPaint = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });

function geometry(from: Element | null) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  let x = width / 2;
  let y = height / 2;
  if (
    from !== null &&
    from !== document.body &&
    from !== document.documentElement
  ) {
    const box = from.getBoundingClientRect();
    if (box.width > 0 && box.height > 0) {
      x = box.left + box.width / 2;
      y = box.top + box.height / 2;
    }
  }
  // Far enough to reach the furthest corner from wherever it starts.
  const radius = Math.ceil(
    Math.hypot(Math.max(x, width - x), Math.max(y, height - y)),
  );
  return { x, y, radius };
}

/** Grows the hole from the circle's centre until no colour is left. */
function open(node: HTMLDivElement, radius: number): Promise<void> {
  return new Promise((resolve) => {
    node.dataset.phase = 'revealing';
    // The transition reads the hole as it was: closed.
    getComputedStyle(node).getPropertyValue('--wipe-hole');
    node.style.setProperty('--wipe-hole', `${String(radius)}px`);
    const done = () => {
      node.removeEventListener('transitionend', onEnd);
      clearTimeout(timer);
      resolve();
    };
    const onEnd = (event: TransitionEvent) => {
      if (event.propertyName === '--wipe-hole') done();
    };
    node.addEventListener('transitionend', onEnd);
    const timer = setTimeout(done, ms('wipe-reveal') + 100);
  });
}

/**
 * The app's ScreenWipe for the web's big moments (AGENTS.md §8, rule 13):
 * a circle of colour grows from the control that was pressed until it
 * covers the screen, the page changes under it, and it opens through a
 * hole at the same point. Only for what happens once or twice a visit —
 * signing in or out, an appointment booked, a payment reported —, always
 * after the API said yes: an error is said where it happened, never under
 * the colour. Under reduced motion, or without the overlay mounted, the
 * change just happens.
 */
export async function wipeScreen({
  tone,
  from,
  whileCovered,
}: WipeOptions): Promise<void> {
  const node = overlay;
  if (
    node === null ||
    running ||
    typeof node.animate !== 'function' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    await whileCovered();
    return;
  }

  running = true;
  const { x, y, radius } = geometry(from ?? document.activeElement);
  const circle = (size: number) =>
    `circle(${String(size)}px at ${String(x)}px ${String(y)}px)`;
  node.dataset.tone = tone;
  node.dataset.phase = 'covering';
  node.style.setProperty('--wipe-x', `${String(x)}px`);
  node.style.setProperty('--wipe-y', `${String(y)}px`);
  node.style.setProperty('--wipe-hole', '0px');
  node.hidden = false;
  const cover = node.animate(
    [{ clipPath: circle(0) }, { clipPath: circle(radius) }],
    {
      duration: ms('wipe-cover'),
      easing: curve('wipe-cover'),
      fill: 'forwards',
    },
  );

  try {
    await cover.finished;
    await Promise.race([whileCovered(), wait(MAX_COVER_MS)]);
  } finally {
    await nextPaint();
    await wait(ms('wipe-hold'));
    await open(node, radius);
    node.hidden = true;
    cover.cancel();
    delete node.dataset.phase;
    node.style.setProperty('--wipe-hole', '0px');
    running = false;
  }
}

/**
 * The wipe's colour, mounted once for the whole web (app/providers.tsx):
 * hidden until a big moment calls `wipeScreen`. It takes part in any page
 * transition under it (`vt-screen-wipe`), so a page that changes beneath
 * never shows through.
 */
export function ScreenWipe() {
  const node = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = node.current;
    overlay = element;
    return () => {
      if (overlay === element) overlay = null;
    };
  }, []);

  return (
    <div
      ref={node}
      aria-hidden="true"
      hidden
      className="screen-wipe vt-screen-wipe"
    />
  );
}
