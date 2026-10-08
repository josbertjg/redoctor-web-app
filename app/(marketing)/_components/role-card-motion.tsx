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

/** The card's pieces, as how-it-works.tsx marks them. */
const piece = (name: string) => `[data-piece="${name}"]`;

/** Seconds between two steps that enter one after the other. */
const stepBeat = 0.1;

type RoleCardMotionProps = {
  /** Seconds the whole card waits: the second card of a row follows the first. */
  delay?: number;
  children: ReactNode;
};

/*
 * A role card of «Así de simple» builds itself as it scrolls into view: the
 * card fades up, the avatar pops in, the words rise, the four steps come
 * out one after another — each from under the one before, the first from
 * under the description, which covers it until then — with their badge
 * popping a third of a fast beat after its row sets off, and the button
 * closes. Seconds count from the moment the card comes into view.
 */
export function RoleCardMotion({ delay = 0, children }: RoleCardMotionProps) {
  const { hidden, sequence } = useMemo(() => {
    const step = {
      duration: readDuration('entrance'),
      ease: readEase('entrance'),
    };
    const at = (seconds: number) => delay + seconds;
    const hidden: Record<string, DOMKeyframesDefinition> = {
      [piece('card')]: { opacity: 0, y: 32 },
      [piece('avatar')]: { opacity: 0, scale: 0.6 },
      [piece('heading')]: { opacity: 0, y: 16 },
      // One row up: under the row before it (or the description).
      [piece('step')]: { opacity: 0, y: '-100%' },
      [piece('badge')]: { opacity: 0, scale: 0.5 },
      [piece('cta')]: { opacity: 0, y: 16 },
    };
    const sequence: AnimationSequence = [
      [piece('card'), { opacity: 1, y: 0 }, { ...step, at: at(0) }],
      [piece('avatar'), { opacity: 1, scale: 1 }, { ...step, at: at(0.15) }],
      [piece('heading'), { opacity: 1, y: 0 }, { ...step, at: at(0.25) }],
      [
        piece('step'),
        { opacity: 1, y: 0 },
        { ...step, at: at(0.4), delay: stagger(stepBeat) },
      ],
      [
        piece('badge'),
        { opacity: 1, scale: 1 },
        {
          ...step,
          at: at(0.4 + readDuration('fast') / 3),
          delay: stagger(stepBeat),
        },
      ],
      [piece('cta'), { opacity: 1, y: 0 }, { ...step, at: at(0.9) }],
    ];
    return { hidden, sequence };
  }, [delay]);

  return (
    <Choreographed hidden={hidden} sequence={sequence}>
      {children}
    </Choreographed>
  );
}
