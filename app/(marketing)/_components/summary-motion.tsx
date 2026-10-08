'use client';

import { useMemo } from 'react';
import type { ReactNode } from 'react';

import { Choreographed, readDuration, readEase } from '@/app/ui/motion';
import type {
  AnimationSequence,
  DOMKeyframesDefinition,
} from '@/app/ui/motion';

/** The section's pieces, as summary.tsx marks them. */
const piece = (name: string) => `[data-piece="${name}"]`;

/*
 * «Del mensaje a la consulta» enters as it scrolls into view: the white box
 * fades in, the title rises and its emojis pop in, the side cards slide out
 * from behind the middle one, and each photo comes in from an edge of its
 * card — the specialist from the right, the eyes from below, the hand from
 * the left. Seconds count from the moment the box comes into view.
 */
export function SummaryMotion({ children }: { children: ReactNode }) {
  const { hidden, sequence } = useMemo(() => {
    const step = {
      duration: readDuration('entrance'),
      ease: readEase('entrance'),
    };
    const hidden: Record<string, DOMKeyframesDefinition> = {
      [piece('box')]: { opacity: 0 },
      [piece('title')]: { opacity: 0, y: 24 },
      [piece('emoji-alarm')]: { opacity: 0, scale: 0.5, rotate: -30 },
      [piece('emoji-eyes')]: { opacity: 0, scale: 0.5 },
      [piece('card-center')]: { opacity: 0, scale: 0.95 },
      [piece('card-left')]: { opacity: 0, x: '110%' },
      [piece('card-right')]: { opacity: 0, x: '-110%' },
      // Off their card's edge; the card clips them until they slide in.
      [piece('photo-left')]: { x: '60%' },
      [piece('photo-center')]: { y: '100%' },
      // The hand is mirrored (scale-x -1): a positive x puts it off to the left.
      [piece('photo-right')]: { x: '74%' },
    };
    const sequence: AnimationSequence = [
      [piece('box'), { opacity: 1 }, { ...step, at: 0 }],
      [piece('title'), { opacity: 1, y: 0 }, { ...step, at: 0.15 }],
      [piece('card-center'), { opacity: 1, scale: 1 }, { ...step, at: 0.3 }],
      [piece('card-left'), { opacity: 1, x: 0 }, { ...step, at: 0.3 }],
      [piece('card-right'), { opacity: 1, x: 0 }, { ...step, at: 0.3 }],
      [
        piece('emoji-alarm'),
        { opacity: 1, scale: 1, rotate: 0 },
        { ...step, at: 0.5 },
      ],
      [piece('emoji-eyes'), { opacity: 1, scale: 1 }, { ...step, at: 0.6 }],
      // The photos one at a time, 200 ms apart: the middle, the left, the right.
      [piece('photo-center'), { y: 0 }, { ...step, at: 0.7 }],
      [piece('photo-left'), { x: 0 }, { ...step, at: 0.9 }],
      [piece('photo-right'), { x: 0 }, { ...step, at: 1.1 }],
    ];
    return { hidden, sequence };
  }, []);

  return (
    <Choreographed hidden={hidden} sequence={sequence}>
      {children}
    </Choreographed>
  );
}
