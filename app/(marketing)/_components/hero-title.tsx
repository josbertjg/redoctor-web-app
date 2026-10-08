'use client';

import { useCallback, useMemo, useState } from 'react';

import Image from 'next/image';

import {
  houseTransition,
  m,
  arcTo,
  readDuration,
  StaggeredText,
  useReducedMotion,
} from '@/app/ui/motion';
import type { TextSegment } from '@/app/ui/motion';

import { useSplashDone } from './splash/splash-state';

/** Where the entrance is: each stage starts when the one before ends. */
type Stage = 'lead' | 'title' | 'cursor' | 'click';

type HeroTitleProps = {
  lead: string;
  title: TextSegment[];
  /** The splash is on: the letters wait for it to leave. */
  waitForSplash: boolean;
};

/*
 * The promise, letter by letter: the first line, then the second, then the
 * cursor arrives and clicks — and keeps clicking now and then.
 */
export function HeroTitle({ lead, title, waitForSplash }: HeroTitleProps) {
  const splashDone = useSplashDone();
  const start = !waitForSplash || splashDone;
  const [stage, setStage] = useState<Stage>('lead');

  const advance = useCallback((from: Stage, to: Stage) => {
    setStage((current) => (current === from ? to : current));
  }, []);
  const toTitle = useCallback(() => {
    advance('lead', 'title');
  }, [advance]);
  const toCursor = useCallback(() => {
    advance('title', 'cursor');
  }, [advance]);
  const toClick = useCallback(() => {
    advance('cursor', 'click');
  }, [advance]);

  return (
    <h1 id="hero-title" className="text-pure-white">
      <StaggeredText
        segments={[{ text: lead }]}
        play={start}
        onComplete={toTitle}
        className="block text-headline-sm font-bold sm:text-headline-lg lg:text-title-xxl"
      />
      <span className="mt-1 inline-flex items-end gap-1 text-display-sm font-bold sm:gap-2 sm:text-display-lg lg:text-display-xl">
        <StaggeredText
          segments={title}
          by="word"
          play={start && stage !== 'lead'}
          onComplete={toCursor}
        />
        <Cursor stage={stage} onEntered={toClick} />
      </span>
    </h1>
  );
}

/* Where the cursor waits: well down and to the right of its place, in the
   title's own em so the sweep grows with the type. */
const farAway = { x: 2, y: 1.5 };
const waiting = {
  opacity: 0,
  x: `${String(farAway.x)}em`,
  y: `${String(farAway.y)}em`,
};
const shown = { opacity: 1, x: 0, y: 0 };

/** The cursor of the mockup: it slides in, presses, and a ring spreads from its tip. */
function Cursor({ stage, onEntered }: { stage: Stage; onEntered: () => void }) {
  const reduced = useReducedMotion();
  const transition = useMemo(() => houseTransition('base'), []);
  // The sweep in: one gentle arc from far below right, bowed a little under
  // the straight line, with the entrance ease over the whole way; it shows
  // up early on the path. The keyframes carry the easing: played linearly.
  const arc = useMemo(
    () => arcTo({ from: farAway, control: { x: 0.8, y: 1.2 } }),
    [],
  );
  const arriving = useMemo(() => ({ opacity: 1, x: arc.x, y: arc.y }), [arc]);
  const sweep = useMemo(() => {
    const along = {
      duration: readDuration('entrance'),
      ease: 'linear' as const,
      times: arc.times,
    };
    return { opacity: houseTransition('fast'), x: along, y: along };
  }, [arc]);
  const press = useMemo(
    () => ({
      ...transition,
      repeat: Infinity,
      repeatDelay: readDuration('cursor-pause'),
    }),
    [transition],
  );
  const visible = reduced || stage === 'cursor' || stage === 'click';
  const clicking = !reduced && stage === 'click';

  return (
    <m.span
      className="relative mb-1 inline-block size-6 sm:size-9 lg:mb-2 lg:size-13"
      initial={false}
      animate={reduced ? shown : visible ? arriving : waiting}
      transition={sweep}
      onAnimationComplete={() => {
        if (stage === 'cursor') onEntered();
      }}
    >
      <m.span
        aria-hidden="true"
        className="absolute top-[12%] left-[12%] size-full -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-pure-white"
        animate={
          clicking ? { scale: [0.3, 1.6], opacity: [0.7, 0] } : { opacity: 0 }
        }
        transition={
          clicking ? { ...press, duration: readDuration('slow') } : transition
        }
      />
      <m.span
        className="block"
        animate={clicking ? { scale: [1, 0.8, 1] } : { scale: 1 }}
        transition={clicking ? press : transition}
      >
        <Image
          src="/illustrations/landing/cursor.svg"
          alt=""
          aria-hidden="true"
          width={54}
          height={55}
          className="size-full"
        />
      </m.span>
    </m.span>
  );
}
