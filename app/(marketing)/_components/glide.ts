/*
 * The glide of a flick: a ribbon let go mid-drag keeps the speed it was
 * thrown at and loses it exponentially, as a native scroll slows down
 * (`--duration-glide` is the time constant: after one, about a third of
 * the speed is left). Integrated exactly, so how far it goes never depends
 * on the frame rate: one slow frame travels as far as many fast ones.
 */

/** The fastest a flick may send the ribbon, in px a second: past it, a wild throw. */
export const maxGlideSpeed = 4000;

/** Under this speed, in px a second, the glide has ended. */
const restSpeed = 1;

/** One frame of a glide: how far it moves in `seconds`, and the speed left after. */
export function glide(
  velocity: number,
  seconds: number,
  timeConstant: number,
): { distance: number; velocity: number } {
  const decay = Math.exp(-seconds / timeConstant);
  const left = velocity * decay;
  return {
    distance: velocity * timeConstant * (1 - decay),
    velocity: Math.abs(left) < restSpeed ? 0 : left,
  };
}

/** The speed a flick hands the ribbon, from the drag's own at the moment it was let go. */
export function glideSpeedFrom(velocity: number): number {
  if (!Number.isFinite(velocity)) return 0;
  return Math.max(-maxGlideSpeed, Math.min(maxGlideSpeed, velocity));
}
