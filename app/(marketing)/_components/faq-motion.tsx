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

/** Seconds between two questions that enter one after the other. */
const rowBeat = 0.07;
/** When the first question sets off. */
const firstRow = 0.4;

/*
 * «Preguntas frecuentes» enters as it scrolls into view: the chip pops,
 * the title and its line rise, then the questions step in from the left
 * one after another, each chevron turning into place with its row and
 * each separator drawing itself from left to right a beat after; the
 * first answer, open on arrival, settles in under its question. Seconds
 * count from the moment the section comes into view.
 */
export function FaqMotion({ children }: { children: ReactNode }) {
  const { hidden, sequence } = useMemo(() => {
    const step = houseTransition('entrance');
    const hidden: Record<string, DOMKeyframesDefinition> = {
      [piece('chip')]: { opacity: 0, scale: 0.6 },
      [piece('title')]: { opacity: 0, y: 24 },
      [piece('description')]: { opacity: 0, y: 16 },
      [piece('row')]: { opacity: 0, x: -16 },
      // Motion turns the chevron's transform; the open state's quarter
      // turn lives in `rotate`, so the two add up.
      [piece('chevron')]: { rotate: -90 },
      [piece('line')]: { scaleX: 0 },
      [piece('answer')]: { opacity: 0, y: -8 },
    };
    const sequence: AnimationSequence = [
      [piece('chip'), { opacity: 1, scale: 1 }, { ...step, at: 0 }],
      [piece('title'), { opacity: 1, y: 0 }, { ...step, at: 0.1 }],
      [piece('description'), { opacity: 1, y: 0 }, { ...step, at: 0.25 }],
      [
        piece('row'),
        { opacity: 1, x: 0 },
        { ...step, at: firstRow, delay: stagger(rowBeat) },
      ],
      [
        piece('chevron'),
        { rotate: 0 },
        { ...step, at: firstRow, delay: stagger(rowBeat) },
      ],
      [
        piece('line'),
        { scaleX: 1 },
        { ...step, at: firstRow + 0.1, delay: stagger(rowBeat) },
      ],
      [piece('answer'), { opacity: 1, y: 0 }, { ...step, at: firstRow + 0.15 }],
    ];
    return { hidden, sequence };
  }, []);

  return (
    <Choreographed hidden={hidden} sequence={sequence}>
      {children}
    </Choreographed>
  );
}
