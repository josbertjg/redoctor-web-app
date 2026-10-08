'use client';

import { useMemo } from 'react';
import type { ReactNode } from 'react';

import {
  Choreographed,
  readDuration,
  readEase,
  stagger,
} from '@/app/ui/motion';
import type {
  AnimationSequence,
  DOMKeyframesDefinition,
} from '@/app/ui/motion';

/** The section's pieces, as trust.tsx marks them. */
const piece = (name: string) => `[data-piece="${name}"]`;

/** Seconds between two cards that enter one after the other. */
const cardBeat = 0.1;
/** When the first card sets off. */
const firstCard = 0.3;

/*
 * «Sí, puedes confiar» enters as it scrolls into view: the chip pops in,
 * the title and its paragraph rise, the first card fades up and the other
 * three come out one after another from behind a card already there: the
 * one above in its column, or else the one just before it — measured from
 * the layout, so in the two-column grid the second slides out to the right
 * and the lower two drop from the upper ones, and on a phone's single
 * column each slides down from under the previous one; none crosses over
 * another's words. Each card's number pops a third of a fast beat after it
 * sets off and its picture rises from the bottom edge a little later.
 * Seconds count from the moment the section comes into view.
 */
export function TrustMotion({ children }: { children: ReactNode }) {
  const { hidden, sequence } = useMemo(() => {
    const step = {
      duration: readDuration('entrance'),
      ease: readEase('entrance'),
    };
    const hidden = (box: HTMLElement) => {
      const states: Record<string, DOMKeyframesDefinition> = {
        [piece('chip')]: { opacity: 0, scale: 0.6 },
        [piece('title')]: { opacity: 0, y: 24 },
        [piece('description')]: { opacity: 0, y: 16 },
        [piece('number')]: { opacity: 0, scale: 0.5 },
        // Below its card's bottom edge; the card clips it until it rises.
        [piece('picture')]: { y: '100%' },
      };
      const cards = Array.from(
        box.querySelectorAll<HTMLElement>('[data-piece^="card-"]'),
      );
      cards.forEach((card, index) => {
        const name = card.dataset.piece ?? '';
        const own = card.getBoundingClientRect();
        const above = cards
          .slice(0, index)
          .reverse()
          .find((c) => Math.abs(c.getBoundingClientRect().left - own.left) < 1);
        const source = above ?? cards[index - 1];
        if (!source) {
          states[piece(name)] = { opacity: 0, y: 24 };
          return;
        }
        const from = source.getBoundingClientRect();
        states[piece(name)] = {
          opacity: 0,
          x: from.left - own.left,
          y: from.top - own.top,
        };
      });
      return states;
    };
    const sequence: AnimationSequence = [
      [piece('chip'), { opacity: 1, scale: 1 }, { ...step, at: 0 }],
      [piece('title'), { opacity: 1, y: 0 }, { ...step, at: 0.1 }],
      [piece('description'), { opacity: 1, y: 0 }, { ...step, at: 0.25 }],
    ];
    for (const n of [1, 2, 3, 4]) {
      sequence.push([
        piece(`card-${String(n)}`),
        { opacity: 1, x: 0, y: 0 },
        { ...step, at: firstCard + (n - 1) * cardBeat },
      ]);
    }
    sequence.push(
      [
        piece('number'),
        { opacity: 1, scale: 1 },
        {
          ...step,
          at: firstCard + readDuration('fast') / 3,
          delay: stagger(cardBeat),
        },
      ],
      [
        piece('picture'),
        { y: 0 },
        { ...step, at: firstCard + 0.15, delay: stagger(cardBeat) },
      ],
    );
    return { hidden, sequence };
  }, []);

  return (
    <Choreographed hidden={hidden} sequence={sequence}>
      {children}
    </Choreographed>
  );
}
