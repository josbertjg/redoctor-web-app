import { preload } from 'react-dom';

import type { Metadata } from 'next';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { panelHintCookie } from '@/app/lib/auth/session-hint';
import { getLandingPlans } from '@/app/lib/data/plans';
import {
  getFeaturedSpecialists,
  getPopularSpecialties,
} from '@/app/lib/data/search-highlights';
import { getSearchCatalog } from '@/app/lib/data/specialties';
import { getSupportContact } from '@/app/lib/data/support';
import { routes } from '@/app/lib/routes';

import { MotionProvider } from '@/app/ui/motion/provider';
import { PageTransition } from '@/app/ui/motion/view-transitions';

import { Faq } from './_components/faq';
import { FeaturedSpecialists } from './_components/featured-specialists';
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
 * sections in the mockup's order, each its own component. The search box
 * (M16) is live: a specialty or a name goes to `/search`, a specialist to
 * their profile; the plans are the API's when it answers the landing
 * (pricing.tsx), and «Comenzar» leads a patient to the search and a
 * specialist to the sign-in (how-it-works.tsx). The patient's highlights
 * (REDOC-177): the most booked specialties under the search and in the
 * empty box, the best rated specialists right after the search
 * (featured-specialists.tsx); the footer's phones are the API's support
 * lines (REDOC-357).
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
  // Read together, each from the Data Cache; the landing stands without any
  // of them (a failed read is an empty list, or null).
  const [catalog, plans, popular, featured, support] = await Promise.all([
    getSearchCatalog(),
    getLandingPlans(),
    getPopularSpecialties(),
    getFeaturedSpecialists(null),
    getSupportContact(),
  ]);
  // The most booked specialties, or the catalog's first when they cannot be read.
  const topSpecialties = popular ?? catalog;

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
          one section into the next (see decor.tsx). Its pieces bring their
          own entrance: the page only fades as it comes and goes (AGENTS.md
          §8, rule 13). */}
      <PageTransition entrance="fade">
        <div className="relative isolate flex flex-1 flex-col overflow-clip bg-primary">
          <LandingHeader
            waitForSplash={showSplash}
            catalog={catalog}
            topSpecialties={topSpecialties}
          />
          <main className="flex flex-col">
            <Hero
              waitForSplash={showSplash}
              catalog={catalog}
              topSpecialties={topSpecialties}
            />
            <FeaturedSpecialists specialists={featured?.specialists ?? []} />
            <Summary />
            <HowItWorks />
            <Trust />
            <Roadmap />
            <Pricing plans={plans} />
            <Faq />
          </main>
          <LandingFooter support={support} />
        </div>
      </PageTransition>
    </MotionProvider>
  );
}
