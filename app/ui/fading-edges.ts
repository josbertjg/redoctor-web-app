/**
 * Fades the sides of a row that scroll on (`data-fade` from
 * `useFadingEdges`, app/hooks/use-fading-edges.ts): 2.5 rem of gradient on
 * each side with more beyond it, nothing where the row ends.
 */
export const fadingEdgesClass =
  'data-[fade=both]:[mask-image:linear-gradient(to_right,transparent,black_2.5rem,black_calc(100%-2.5rem),transparent)] data-[fade=end]:[mask-image:linear-gradient(to_right,black_calc(100%-2.5rem),transparent)] data-[fade=start]:[mask-image:linear-gradient(to_left,black_calc(100%-2.5rem),transparent)]';
