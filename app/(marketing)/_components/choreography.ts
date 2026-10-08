/*
 * The landing's entrance, beat by beat: seconds after the splash leaves (or
 * after the page loads, when there is no splash) at which each piece starts.
 * The slogan's two lines and the cursor chain on one another instead
 * (hero-title.tsx): the first line's letters, the second line's words, then
 * the cursor; the pieces below start on these beats meanwhile.
 */
export const beats = {
  /** The bar waits for the veil's fade to be over before it slides down. */
  bar: 0.3,
  /** The search bar fades up a beat after the bar has settled (an entrance later). */
  search: 0.9,
  /** Once the search bar is in place (an entrance later), the specialist rises out of it. */
  doctor: 1.4,
  /** The chips, from the middle of the row outwards: a pair every step. */
  chips: 1.5,
  chipStep: 0.06,
} as const;
