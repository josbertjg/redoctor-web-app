import type { Metadata } from 'next';

import { Faq } from './_components/faq';
import { Hero } from './_components/hero';
import { HowItWorks } from './_components/how-it-works';
import { LandingFooter } from './_components/landing-footer';
import { LandingHeader } from './_components/landing-header';
import { Pricing } from './_components/pricing';
import { Roadmap } from './_components/roadmap';
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
 */
export default function HomePage() {
  return (
    <div className="relative isolate flex flex-1 flex-col overflow-x-clip bg-primary">
      <LandingHeader />
      <main className="flex flex-col">
        <Hero />
        <Summary />
        <HowItWorks />
        <Trust />
        <Roadmap />
        <Pricing />
        <Faq />
      </main>
      <LandingFooter />
    </div>
  );
}
