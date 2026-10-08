import { cubicBezier } from 'framer-motion';

import { readEase } from './tokens';

import type { EaseToken } from './tokens';

type Point = { x: number; y: number };

type ArcOptions = {
  /** Where the piece starts, relative to its place (the origin). */
  from: Point;
  /** Where the arc bows towards: a quadratic Bézier's control point. */
  control: Point;
  /** Keyframes along the way; more is smoother. */
  steps?: number;
  /** The easing of the progress along the arc, over the whole way. */
  ease?: EaseToken;
  /** The unit of the points: `em` keeps the sweep proportional to the type. */
  unit?: 'em' | 'px';
};

export type Arc = { x: string[]; y: string[]; times: number[] };

/**
 * Keyframes for a sweep into place along one gentle bend: a quadratic
 * Bézier from `from` to the origin, bowed towards `control`, with the given
 * easing along it. Play them with a linear ease and these `times`: the
 * easing is already in the points. One curve, so no S.
 */
export function arcTo({
  from,
  control,
  steps = 16,
  ease = 'entrance',
  unit = 'em',
}: ArcOptions): Arc {
  const progress = cubicBezier(...readEase(ease));
  const at = (s: number): Point => {
    const a = (1 - s) ** 2;
    const b = 2 * (1 - s) * s;
    return { x: a * from.x + b * control.x, y: a * from.y + b * control.y };
  };
  const arc: Arc = { x: [], y: [], times: [] };
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const point = at(progress(t));
    arc.x.push(`${point.x.toFixed(3)}${unit}`);
    arc.y.push(`${point.y.toFixed(3)}${unit}`);
    arc.times.push(t);
  }
  return arc;
}
