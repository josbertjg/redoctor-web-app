'use client';

import { useMemo } from 'react';
import type { ReactNode } from 'react';

import {
  arcTo,
  Choreographed,
  houseTransition,
  piece,
  readDuration,
  readEase,
  stagger,
} from '@/app/ui/motion';
import type {
  AnimationSequence,
  DOMKeyframesDefinition,
} from '@/app/ui/motion';

/** Seconds between two cards that land one after the other. */
const cardBeat = 0.1;
/** Where the rocket takes off from, in em of the lead line: below left. */
const launchPad = { x: -1.5, y: 1 };

/*
 * «Prepárate para lo que viene» enters as it scrolls into view: the rocket
 * flies in along one gentle arc from below left and the lead line rises
 * behind it, the title follows, the pin drops into place, and the cards
 * land on the ribbon one after another from the right — the ribbon keeps
 * rolling, it is slow enough — each badge popping a third of a fast beat
 * after its card. Seconds count from the moment the section comes into
 * view.
 */
export function RoadmapMotion({ children }: { children: ReactNode }) {
  const { hidden, sequence } = useMemo(() => {
    const step = houseTransition('entrance');
    const flight = arcTo({ from: launchPad, control: { x: -0.9, y: -0.35 } });
    const hidden: Record<string, DOMKeyframesDefinition> = {
      [piece('rocket')]: {
        opacity: 0,
        x: `${String(launchPad.x)}em`,
        y: `${String(launchPad.y)}em`,
      },
      [piece('lead')]: { opacity: 0, y: 12 },
      [piece('pin')]: { opacity: 0, y: '-0.8em' },
      [piece('title')]: { opacity: 0, y: 24 },
      [piece('card')]: { opacity: 0, x: 80 },
      [piece('badge')]: { opacity: 0, scale: 0.5 },
    };
    const sequence: AnimationSequence = [
      // The keyframes carry the easing: played linearly (arcTo).
      [
        piece('rocket'),
        { x: flight.x, y: flight.y },
        { ...step, ease: 'linear', times: flight.times, at: 0 },
      ],
      [
        piece('rocket'),
        { opacity: 1 },
        { duration: readDuration('fast'), ease: readEase('house'), at: 0 },
      ],
      [piece('lead'), { opacity: 1, y: 0 }, { ...step, at: 0.1 }],
      [piece('title'), { opacity: 1, y: 0 }, { ...step, at: 0.2 }],
      [piece('pin'), { opacity: 1, y: 0 }, { ...step, at: 0.35 }],
      [
        piece('card'),
        { opacity: 1, x: 0 },
        { ...step, at: 0.4, delay: stagger(cardBeat) },
      ],
      [
        piece('badge'),
        { opacity: 1, scale: 1 },
        {
          ...step,
          at: 0.4 + readDuration('fast') / 3,
          delay: stagger(cardBeat),
        },
      ],
    ];
    return { hidden, sequence };
  }, []);

  return (
    <Choreographed hidden={hidden} sequence={sequence}>
      {children}
    </Choreographed>
  );
}
