import type { Transition } from 'framer-motion';

/*
 * Motion takes its timings from the design tokens (app/ui/tokens.css), so
 * CSS and JavaScript animations share one clock and prefers-reduced-motion
 * collapses both. Motion counts in seconds. Where there is no document (the
 * server, tests) the values are the tokens' own.
 */

export type DurationToken =
  | 'fast'
  | 'base'
  | 'slow'
  | 'entrance'
  | 'splash'
  | 'splash-fallback'
  | 'cursor-pause'
  | 'marquee';

const durations: Record<DurationToken, number> = {
  fast: 0.2,
  base: 0.25,
  slow: 0.3,
  entrance: 0.5,
  splash: 1.5,
  'splash-fallback': 2.5,
  'cursor-pause': 5,
  marquee: 45,
};

type Bezier = [number, number, number, number];

export type EaseToken = 'house' | 'entrance';

/** ease-in-out for UI feedback, and the stronger one the entrances take. */
const eases: Record<EaseToken, Bezier> = {
  house: [0.42, 0, 0.58, 1],
  entrance: [0.65, 0, 0.35, 1],
};

function readToken(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value === '' ? undefined : value;
}

/** A duration token, in seconds. */
export function readDuration(token: DurationToken): number {
  const match = /^([\d.]+)(ms|s)$/.exec(readToken(`--duration-${token}`) ?? '');
  if (!match) return durations[token];
  const value = Number(match[1]);
  return match[2] === 'ms' ? value / 1000 : value;
}

/** An easing token, as Motion wants it. */
export function readEase(token: EaseToken = 'house'): Bezier {
  const match = /^cubic-bezier\(([^)]+)\)$/.exec(
    readToken(`--ease-${token}`) ?? '',
  );
  const parts = match?.[1]?.split(',').map((part) => Number(part.trim()));
  return parts?.length === 4 && parts.every(Number.isFinite)
    ? (parts as Bezier)
    : eases[token];
}

/**
 * The house transition: a tween of the given duration. UI feedback (fast,
 * base, slow) eases the house way; an entrance takes the entrance ease.
 */
export function houseTransition(
  token: 'fast' | 'base' | 'slow' | 'entrance' = 'base',
): Transition {
  return {
    duration: readDuration(token),
    ease: readEase(token === 'entrance' ? 'entrance' : 'house'),
  };
}
