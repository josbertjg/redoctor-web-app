import { preload } from 'react-dom';

import type { Metadata } from 'next';

import { cookies } from 'next/headers';

import { MotionProvider } from '@/app/ui/motion/provider';

import { Faq } from './_components/faq';
import { Hero } from './_components/hero';
import { HowItWorks } from './_components/how-it-works';
import { LandingFooter } from './_components/landing-footer';
import { LandingHeader } from './_components/landing-header';
import { Pricing } from './_components/pricing';
import { Roadmap } from './_components/roadmap';
import { splashCookie } from './_components/splash/splash-cookie';
import { SplashVeil } from './_components/splash/splash-veil';
import { Summary } from './_components/summary';
import { Trust } from './_components/trust';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

/*
 * The landing (M9), after the middle mockup of Figma «LANDING PAGE»: the
 * sections in the mockup's order, each its own component. This stage is
 * the look and the structure; the search, the sign-in and the plans get
 * their logic in later steps (the TODOs inside each section).
 *
 * A session's first visit opens with the splash veil (the app's logo); the
 * cookie it leaves says the next visits do not. The hero's words wait for it.
 */
export default async function HomePage() {
  const showSplash = !(await cookies()).has(splashCookie);
  if (showSplash) {
    // The logo's runtime and file start downloading with the HTML, not after
    // hydration: the veil shows the entrance sooner.
    preload('/animations/rive.wasm', {
      as: 'fetch',
      type: 'application/wasm',
      crossOrigin: 'anonymous',
    });
    preload('/animations/splash-logo.riv', {
      as: 'fetch',
      crossOrigin: 'anonymous',
    });
  }

  return (
    <MotionProvider>
      {showSplash && <SplashVeil />}
      {/* The page clips the background shapes at its own edges (`clip` keeps
          the header sticky); the sections never do, so a shape can run from
          one section into the next (see decor.tsx). */}
      <div className="relative isolate flex flex-1 flex-col overflow-clip bg-primary">
        <LandingHeader waitForSplash={showSplash} />
        <main className="flex flex-col">
          <Hero waitForSplash={showSplash} />
          <Summary />
          <HowItWorks />
          <Trust />
          <Roadmap />
          <Pricing />
          <Faq />
        </main>
        <LandingFooter />
      </div>
    </MotionProvider>
  );
}
