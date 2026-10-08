'use client';

import { Fragment, useEffect, useMemo } from 'react';

import { m } from 'framer-motion';

import { cn } from '@/app/lib/utils';

import { useReducedMotion } from './reduced-motion';
import { houseTransition } from './tokens';

import type { Variants } from 'framer-motion';

/** A run of text with one look: the accent word of a title, for instance. */
export type TextSegment = { text: string; className?: string | undefined };

type StaggeredTextProps = {
  segments: TextSegment[];
  /** Starts the entrance; until then the letters stay hidden. */
  play?: boolean;
  /** Seconds between one letter and the next. */
  stagger?: number;
  onComplete?: (() => void) | undefined;
  className?: string;
};

const letter: Variants = {
  hidden: { opacity: 0, y: '0.35em' },
  shown: { opacity: 1, y: 0 },
};

type Letter = { char: string; className?: string | undefined };

/** Words of letters, so a word never breaks across lines. */
function toWords(segments: TextSegment[]): Letter[][] {
  const words: Letter[][] = [];
  let current: Letter[] = [];
  const flush = () => {
    if (current.length > 0) words.push(current);
    current = [];
  };
  for (const segment of segments) {
    for (const char of segment.text) {
      if (char === ' ') flush();
      else current.push({ char, className: segment.className });
    }
  }
  flush();
  return words;
}

/**
 * A line of text whose letters enter one after another. Screen readers get
 * the plain text; the animated letters are hidden from them. Under reduced
 * motion it is plain text and counts as complete at once.
 */
export function StaggeredText({
  segments,
  play = true,
  stagger = 0.02,
  onComplete,
  className,
}: StaggeredTextProps) {
  const reduced = useReducedMotion();
  const transition = useMemo(() => houseTransition('entrance'), []);
  const container = useMemo<Variants>(
    () => ({ shown: { transition: { staggerChildren: stagger } } }),
    [stagger],
  );

  useEffect(() => {
    if (reduced && play) onComplete?.();
  }, [reduced, play, onComplete]);

  if (reduced) {
    return (
      <span className={className}>
        {segments.map((segment, index) => (
          <span key={index} className={segment.className}>
            {segment.text}
          </span>
        ))}
      </span>
    );
  }

  return (
    <span className={className}>
      <span className="sr-only">
        {segments.map((segment) => segment.text).join('')}
      </span>
      <m.span
        aria-hidden="true"
        initial="hidden"
        animate={play ? 'shown' : 'hidden'}
        variants={container}
        onAnimationComplete={(definition) => {
          if (definition === 'shown') onComplete?.();
        }}
      >
        {toWords(segments).map((word, wordIndex) => (
          <Fragment key={wordIndex}>
            {wordIndex > 0 && ' '}
            <span className="inline-block">
              {word.map((item, index) => (
                <m.span
                  key={index}
                  variants={letter}
                  transition={transition}
                  className={cn('inline-block', item.className)}
                >
                  {item.char}
                </m.span>
              ))}
            </span>
          </Fragment>
        ))}
      </m.span>
    </span>
  );
}
