import { preload } from 'react-dom';

import type { Metadata } from 'next';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { panelHintCookie } from '@/app/lib/auth/session-hint';
import { routes } from '@/app/lib/routes';

import { MotionProvider } from '@/app/ui/motion/provider';

import { Faq } from './_components/faq';
import { Hero } from './_components/hero';
import { HowItWorks } from './_components/how-it-works';
import { LandingFooter } from './_components/landing-footer';
import { LandingHeader } from './_components/landing-header';
import { Pricing } from './_components/pricing';
import { Roadmap } from './_components/roadmap';
import { SpecialistRedirect } from './_components/specialist-redirect';
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
 *
 * A specialist never sees it (owner, 2026-10-13): its search and plans read
 * as an offer to book, which they cannot. Their browser carries the panel
 * hint, so the server sends them to `/panel` before painting anything.
 */
export default async function HomePage() {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
  if (cookieStore.get(panelHintCookie)?.value === '1') {
    redirect(routes.specialistHome());
  }
  // A visit that asks to save data does without the splash and its ~370 KB
  // (the veil checks the connection again once it runs).
  const savesData = headerList.get('save-data') === 'on';
  const showSplash = !cookieStore.has(splashCookie) && !savesData;
  if (showSplash) {
    // The logo's runtime and file start downloading with the HTML, not after
    // hydration: the veil shows the entrance sooner. At a low priority, so
    // they never get ahead of the page's own scripts.
    preload('/animations/rive.wasm', {
      as: 'fetch',
      type: 'application/wasm',
      crossOrigin: 'anonymous',
      fetchPriority: 'low',
    });
    preload('/animations/splash-logo.riv', {
      as: 'fetch',
      crossOrigin: 'anonymous',
      fetchPriority: 'low',
    });
  }

  return (
    <MotionProvider>
      {/* Without JavaScript nothing would ever enter: every piece shows
          where it settles (the same rule globals.css keeps for reduced motion). */}
      <noscript>
        <style>
          {'[data-entrance]{opacity:1!important;transform:none!important}'}
        </style>
      </noscript>
      <SpecialistRedirect />
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
