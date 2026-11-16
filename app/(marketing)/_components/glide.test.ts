import { describe, expect, it } from 'vitest';

import { glide, glideSpeedFrom, maxGlideSpeed } from './glide';

const timeConstant = 0.4;

describe('glide', () => {
  it('travels as far in one slow frame as in many fast ones', () => {
    const slow = glide(1500, 0.5, timeConstant);
    let velocity = 1500;
    let distance = 0;
    for (let frame = 0; frame < 30; frame++) {
      const step = glide(velocity, 0.5 / 30, timeConstant);
      distance += step.distance;
      velocity = step.velocity;
    }
    expect(distance).toBeCloseTo(slow.distance, 6);
    expect(velocity).toBeCloseTo(slow.velocity, 6);
  });

  it('keeps about a third of its speed after one time constant, as a native scroll slows', () => {
    const { velocity } = glide(1200, timeConstant, timeConstant);
    expect(velocity).toBeCloseTo(1200 / Math.E, 6);
  });

  it('glides speed × time constant in all, then rests', () => {
    const { distance, velocity } = glide(-1000, 10, timeConstant);
    expect(distance).toBeCloseTo(-1000 * timeConstant, 3);
    expect(velocity).toBe(0);
  });
});

describe('glideSpeedFrom', () => {
  it('takes a flick’s speed as it was let go, never a wild throw', () => {
    expect(glideSpeedFrom(900)).toBe(900);
    expect(glideSpeedFrom(-50_000)).toBe(-maxGlideSpeed);
    expect(glideSpeedFrom(Number.NaN)).toBe(0);
  });
});
