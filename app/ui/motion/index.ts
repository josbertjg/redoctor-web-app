import 'client-only';

/*
 * The one door to Motion (AGENTS.md §8, rule 11): client components import
 * `m`, the hooks and the helpers from here, never from `framer-motion`, so
 * the library loads once and lazily (MotionProvider, which server components
 * import on its own from `./provider`) and the house timings apply
 * everywhere. It is `framer-motion`, not the `motion` wrapper: that one is
 * an `export *` barrel Turbopack cannot tree-shake, and it shipped the whole
 * library (40 KB) where this ships what the page uses (10 KB).
 */
export { AnimatePresence, m, stagger } from 'framer-motion';
export type {
  AnimationSequence,
  DOMKeyframesDefinition,
  Transition,
  Variants,
} from 'framer-motion';
export { arcTo, type Arc } from './arc';
export { Choreographed } from './choreographed';
export { Entrance } from './entrance';
export { useReducedMotion } from './reduced-motion';
export { StaggeredText, type TextSegment } from './staggered-text';
export { houseTransition, readDuration, readEase } from './tokens';
