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
  /** What enters one after another: each letter, or each word whole. */
  by?: 'letter' | 'word';
  /** Starts the entrance; until then the text stays hidden. */
  play?: boolean;
  /** Seconds between one piece and the next: 0.02 for letters, 0.08 for words. */
  stagger?: number;
  onComplete?: (() => void) | undefined;
  className?: string;
};

const piece: Variants = {
  hidden: { opacity: 0, y: '0.35em' },
  shown: { opacity: 1, y: 0 },
};

type Run = { text: string; className?: string | undefined };

// A letter as a person sees it, whatever code points it takes.
const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

function letters(text: string): string[] {
  return Array.from(segmenter.segment(text), (piece) => piece.segment);
}

/** Words, each as runs of same-looking text, so a word never breaks across lines. */
function toWords(segments: TextSegment[]): Run[][] {
  const words: Run[][] = [];
  let current: Run[] = [];
  const flush = () => {
    if (current.length > 0) words.push(current);
    current = [];
  };
  for (const segment of segments) {
    for (const char of letters(segment.text)) {
      if (char === ' ') {
        flush();
        continue;
      }
      const last = current.at(-1);
      if (last && last.className === segment.className) last.text += char;
      else current.push({ text: char, className: segment.className });
    }
  }
  flush();
  return words;
}

/**
 * A line of text whose letters, or words, enter one after another. Screen
 * readers get the plain text; the animated pieces are hidden from them.
 * Under reduced motion it is plain text and counts as complete at once.
 */
export function StaggeredText({
  segments,
  by = 'letter',
  play = true,
  stagger,
  onComplete,
  className,
}: StaggeredTextProps) {
  const reduced = useReducedMotion();
  const transition = useMemo(() => houseTransition('entrance'), []);
  const step = stagger ?? (by === 'word' ? 0.08 : 0.02);
  const container = useMemo<Variants>(
    () => ({ shown: { transition: { staggerChildren: step } } }),
    [step],
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
            {by === 'word' ? (
              <m.span
                variants={piece}
                transition={transition}
                className="inline-block"
              >
                {word.map((run, index) => (
                  <span key={index} className={run.className}>
                    {run.text}
                  </span>
                ))}
              </m.span>
            ) : (
              <span className="inline-block">
                {word.flatMap((run, runIndex) =>
                  letters(run.text).map((char, index) => (
                    <m.span
                      key={`${String(runIndex)}-${String(index)}`}
                      variants={piece}
                      transition={transition}
                      className={cn('inline-block', run.className)}
                    >
                      {char}
                    </m.span>
                  )),
                )}
              </span>
            )}
          </Fragment>
        ))}
      </m.span>
    </span>
  );
}
