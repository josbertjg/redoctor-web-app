import { ViewTransition, type ReactNode } from 'react';

/*
 * The page transitions' React side (AGENTS.md §8, rule 13): React's
 * <ViewTransition>, which runs the browser's View Transitions for every
 * navigation (Next.js navigates inside transitions), with the classes
 * app/ui/motion/page-transitions.css animates. No JavaScript of ours runs
 * the animation, and a browser without View Transitions changes the page
 * at once, as before. Server-safe: pages import it from here; the client
 * helpers (`moveStep`, `useSkeletonHold`, `wipeScreen`) come from
 * `app/ui/motion`.
 */

/** A navigation one step forward (`<Link transitionTypes>`, `moveStep`). */
export const navForward = 'nav-forward';
/** A navigation one step back. */
export const navBack = 'nav-back';

/**
 * What a page or a step does as it enters or leaves: the shared axis when
 * the change says its direction, else the house rise. React reads it from
 * the transition's types, so the page that leaves and the one that arrives
 * always agree.
 */
const change = {
  [navForward]: 'page-forward',
  [navBack]: 'page-back',
  default: 'page',
};

const fadeOnly = {
  [navForward]: 'page-forward',
  [navBack]: 'page-back',
  default: 'page-fade',
};

type PageTransitionProps = {
  /**
   * `fade` for a page that brings its own entrance (the landing's
   * choreography): it only fades, so nothing rises twice.
   */
  entrance?: 'rise' | 'fade';
  children: ReactNode;
};

/**
 * Wraps what a page shows under its bars — never the bar itself, which
 * holds still (`vt-site-header` and the others, page-transitions.css). The
 * old page leaves, the new one arrives; the same page with new content (a
 * search answered, the data arrived after a `useSkeletonHold`) crossfades.
 */
export function PageTransition({
  entrance = 'rise',
  children,
}: PageTransitionProps) {
  const enterOrLeave = entrance === 'fade' ? fadeOnly : change;
  return (
    <ViewTransition
      enter={enterOrLeave}
      exit={enterOrLeave}
      update="page-update"
      default="none"
    >
      {children}
    </ViewTransition>
  );
}

/**
 * A layout's own box around its pages (`PageFrame`'s `<main>`). React runs
 * the enter and exit of a <ViewTransition> only when no element of what is
 * inserted or removed contains it, so a page inside a layout's `<main>`
 * cannot leave on its own when the whole layout goes (from the panel to the
 * subscription, from «Mis citas» to the legal pages): the frame leaves and
 * arrives in its place, as a page does. Between two pages of the same frame
 * it stays still, and the page's own `PageTransition` moves.
 */
export function FrameTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter={change} exit={change} default="none">
      {children}
    </ViewTransition>
  );
}

/**
 * A flow's steps inside one page (the booking's, the payment's): each step
 * enters and leaves on its own, sideways when the change says its
 * direction (`moveStep`), else rising, as a page does. `step` names the
 * step on screen: a new one is a new step.
 */
export function StepTransition({
  step,
  children,
}: {
  step: string;
  children: ReactNode;
}) {
  return (
    <ViewTransition key={step} enter={change} exit={change} default="none">
      {children}
    </ViewTransition>
  );
}

/** The view-transition names of what travels between two pages. */
export const sharedNames = {
  specialistPhoto: (id: string) => `specialist-photo-${id}`,
  specialistName: (id: string) => `specialist-name-${id}`,
} as const;

/**
 * One thing on two pages — a result's photo and its profile's — travels
 * from one place to the other when the page changes. Both pages wrap it
 * with the same `name`; with no counterpart it does nothing of its own.
 */
export function SharedTransition({
  name,
  children,
}: {
  name: string;
  children: ReactNode;
}) {
  return (
    <ViewTransition name={name} share="morph" default="none">
      {children}
    </ViewTransition>
  );
}
