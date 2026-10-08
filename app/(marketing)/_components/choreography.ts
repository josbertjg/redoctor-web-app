/*
 * The landing's entrance, beat by beat: seconds after the splash leaves (or
 * after the page loads, when there is no splash) at which each piece starts.
 * The pieces that chain on one another (the slogan's lines, the cursor) take
 * their cue from the one before instead.
 */
export const beats = {
  /** The bar waits for the veil's fade to be over before it slides down. */
  bar: 0.3,
} as const;
