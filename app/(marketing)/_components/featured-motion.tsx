'use client';

import { useMemo } from 'react';
import type { ReactNode } from 'react';

import {
  Choreographed,
  houseTransition,
  piece,
  stagger,
} from '@/app/ui/motion';
import type {
  AnimationSequence,
  DOMKeyframesDefinition,
} from '@/app/ui/motion';

/** Seconds between two cards that rise one after the other. */
const cardBeat = 0.1;
/** When the first card sets off. */
const firstCard = 0.35;

/*
 * «Especialistas destacados» enters as it scrolls into view: the chip
 * pops, the title and its line rise, then the cards rise one after the
 * other — in reading order, row by row — and the way to the rest last.
 * Seconds count from the moment the section comes into view.
 */
export function FeaturedMotion({ children }: { children: ReactNode }) {
  const { hidden, sequence } = useMemo(() => {
    const step = houseTransition('entrance');
    const hidden: Record<string, DOMKeyframesDefinition> = {
      [piece('chip')]: { opacity: 0, scale: 0.6 },
      [piece('title')]: { opacity: 0, y: 24 },
      [piece('description')]: { opacity: 0, y: 16 },
      [piece('card')]: { opacity: 0, y: 32 },
      [piece('more')]: { opacity: 0, y: 16 },
    };
    const sequence: AnimationSequence = [
      [piece('chip'), { opacity: 1, scale: 1 }, { ...step, at: 0 }],
      [piece('title'), { opacity: 1, y: 0 }, { ...step, at: 0.1 }],
      [piece('description'), { opacity: 1, y: 0 }, { ...step, at: 0.25 }],
      [
        piece('card'),
        { opacity: 1, y: 0 },
        { ...step, at: firstCard, delay: stagger(cardBeat) },
      ],
      [piece('more'), { opacity: 1, y: 0 }, { ...step, at: firstCard + 0.4 }],
    ];
    return { hidden, sequence };
  }, []);

  return (
    <Choreographed hidden={hidden} sequence={sequence}>
      {children}
    </Choreographed>
  );
}
