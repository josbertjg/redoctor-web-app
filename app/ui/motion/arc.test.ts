import { describe, expect, it } from 'vitest';

import { arcTo } from './arc';

const value = (keyframe: string) => Number.parseFloat(keyframe);

describe('arcTo', () => {
  it('runs from the start to the origin along a single bend', () => {
    const arc = arcTo({ from: { x: 2, y: 1.5 }, control: { x: 0.8, y: 1.2 } });

    expect(arc.x).toHaveLength(17);
    expect(arc.times[0]).toBe(0);
    expect(arc.times.at(-1)).toBe(1);
    expect(arc.x[0]).toBe('2.000em');
    expect(arc.y[0]).toBe('1.500em');
    expect(arc.x.at(-1)).toBe('0.000em');
    expect(arc.y.at(-1)).toBe('0.000em');

    // Each step gets nearer on both axes: no going back.
    const xs = arc.x.map(value);
    const ys = arc.y.map(value);
    for (let i = 1; i < xs.length; i++) {
      expect(xs[i]).toBeLessThanOrEqual(xs[i - 1] ?? 0);
      expect(ys[i]).toBeLessThanOrEqual(ys[i - 1] ?? 0);
    }

    // The path bends one way only: the turn between consecutive segments
    // never changes sign, which is what rules out an S. Turns under the
    // noise of the three-decimal rounding (the tiny eased steps at either
    // end) say nothing and are left out.
    const signs = new Set<number>();
    for (let i = 2; i < xs.length; i++) {
      const ax = (xs[i - 1] ?? 0) - (xs[i - 2] ?? 0);
      const ay = (ys[i - 1] ?? 0) - (ys[i - 2] ?? 0);
      const bx = (xs[i] ?? 0) - (xs[i - 1] ?? 0);
      const by = (ys[i] ?? 0) - (ys[i - 1] ?? 0);
      const turn = ax * by - ay * bx;
      if (Math.abs(turn) < 1e-4) continue;
      signs.add(Math.sign(turn));
    }
    expect(signs.size).toBe(1);
  });
});
