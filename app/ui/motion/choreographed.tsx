'use client';

import { useEffect } from 'react';
import type { ReactNode } from 'react';

import { useAnimate } from 'framer-motion';

import type { AnimationSequence, DOMKeyframesDefinition } from 'framer-motion';

type ChoreographedProps = {
  /** Each piece's state before it enters, by selector inside the box. */
  hidden: Record<string, DOMKeyframesDefinition>;
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
    // Already on screen means enough of it to count as seen — the same
    // share that would start the entrance; a sliver of its edge does not.
    const rect = box.getBoundingClientRect();
    const visible =
      Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
    const onScreen = rect.height > 0 && visible / rect.height >= amount;
    if (
      reducesMotion ||
      onScreen ||
      typeof IntersectionObserver === 'undefined'
    )
      return;

    for (const [selector, state] of Object.entries(hidden)) {
      animate(selector, state, { duration: 0 });
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        void animate(sequence);
      },
      { threshold: amount },
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
