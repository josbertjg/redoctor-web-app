'use client';

import { useEffect } from 'react';
import type { ReactNode } from 'react';

import { useAnimate } from 'framer-motion';

import type { AnimationSequence, DOMKeyframesDefinition } from 'framer-motion';

type HiddenStates = Record<string, DOMKeyframesDefinition>;

/** A piece of a choreographed box, by the `data-piece` name its markup gives it. */
export const piece = (name: string) => `[data-piece="${name}"]`;

type ChoreographedProps = {
  /**
   * Each piece's state before it enters, by selector inside the box — or a
   * function of the box, for states measured from where the pieces sit.
   */
  hidden: HiddenStates | ((box: HTMLDivElement) => HiddenStates);
  /** The entrance: a Motion sequence over the same selectors. */
  sequence: AnimationSequence;
  /** How much of the box must be on screen for the entrance to start. */
  amount?: number;
  className?: string;
  children: ReactNode;
};

/**
 * A box whose pieces enter on a sequence when it scrolls into view. The
 * HTML arrives visible: only after hydration, and only if the box is still
 * out of view, do the pieces take their hidden state until it enters. What
 * is already on screen, reduced-motion users and environments without an
 * observer never see a hidden state (AGENTS.md §8.2). The pieces are plain
 * elements found by selector inside the box, so the box's content can come
 * from the server. Give `hidden` and `sequence` a stable identity (memo).
 */
export function Choreographed({
  hidden,
  sequence,
  amount = 0.3,
  className,
  children,
}: ChoreographedProps) {
  const [scope, animate] = useAnimate<HTMLDivElement>();

  useEffect(() => {
    const box = scope.current;
    const reducesMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const rect = box.getBoundingClientRect();
    // A box taller than the screen can never show 30 % of itself (a column of
    // plans on a small phone, any section in landscape): the share asked is
    // the one it can reach, never more than 80 % of the screen's height.
    const share =
      rect.height > 0
        ? Math.min(amount, (0.8 * window.innerHeight) / rect.height)
        : amount;
    // Already on screen means enough of it to count as seen — the same
    // share that would start the entrance; a sliver of its edge does not.
    const visible =
      Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
    const onScreen = rect.height > 0 && visible / rect.height >= share;
    if (
      reducesMotion ||
      onScreen ||
      typeof IntersectionObserver === 'undefined'
    )
      return;

    const states = typeof hidden === 'function' ? hidden(box) : hidden;
    for (const [selector, state] of Object.entries(states)) {
      animate(selector, state, { duration: 0 });
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        void animate(sequence);
      },
      { threshold: share },
    );
    observer.observe(box);
    return () => {
      observer.disconnect();
    };
  }, [scope, animate, hidden, sequence, amount]);

  return (
    <div ref={scope} className={className}>
      {children}
    </div>
  );
}
