import type { Route } from 'next';

import Image from 'next/image';
import Link from 'next/link';

import { useTranslations } from 'next-intl';

import { routes } from '@/app/lib/routes';
import { cn } from '@/app/lib/utils';

import { Button } from '@/app/ui/button';

import { Plus, Swirl } from './decor';
import { IconBadge, toneFills } from './icon-badge';
import { Reveal } from './reveal';
import { accentOnBlue } from './rich';
import { RoleCardMotion } from './role-card-motion';
import {
  landingSections,
  patientSteps,
  specialistSteps,
  type IconTone,
} from '../_data/landing-content';

/*
 * «Así de simple» (Figma): one card per role with its four steps. The copy
 * of the steps is the mockup's; the landing doc's longer version waits for
 * the decision on the final copy. Each card builds itself as it scrolls
 * into view (role-card-motion.tsx, through the `data-piece` marks) and
 * answers the pointer: over the card the avatar nods and the steps lean
 * right one after another; over a step, it lifts and its badge grows.
 * «Comenzar» leads where each role starts: a specialist to the sign-in (a
 * new account goes on to the sign-up, which points specialists to the
 * app), a patient to the search, which needs no account (AGENTS.md §1).
 */
export function HowItWorks() {
  const t = useTranslations('landing.howItWorks');

  return (
    <section
      id={landingSections.howItWorks}
      aria-labelledby="how-it-works-title"
      className="relative scroll-mt-28 px-gutter py-16 lg:py-24"
    >
      <Swirl variant="bg-1" className="top-[8%] left-[16%] w-[110%]" />
      <Plus className="top-0 right-[16%] w-16 opacity-30" />
      <Plus className="top-[7%] right-[12%] w-8 opacity-20" />
      <Plus className="top-[31%] left-[8%] hidden w-8 opacity-20 lg:block" />
      <Plus className="bottom-[-2%] left-[9%] hidden w-24 opacity-20 lg:block" />
      <Reveal className="relative">
        <h2
          id="how-it-works-title"
          className="text-center text-headline-md font-bold text-pure-white sm:text-display-sm lg:text-title-xxxl"
        >
          {t.rich('title', accentOnBlue)}
        </h2>
      </Reveal>
      <div className="relative mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2 lg:mt-14 lg:gap-10">
        <RoleCardMotion>
          <RoleCard
            illustration="avatar-specialist"
            title={t('specialist.title')}
            description={t('specialist.description')}
            steps={specialistSteps.map((step) => ({
              key: step.key,
              icon: step.icon,
              tone: step.tone,
              label: t(`specialist.steps.${step.key}`),
            }))}
            cta={t('cta')}
            href={routes.signIn()}
          />
        </RoleCardMotion>
        {/* A step beat behind its neighbour when the two share a row. */}
        <RoleCardMotion delay={0.1}>
          <RoleCard
            illustration="avatar-patient"
            title={t('patient.title')}
            description={t('patient.description')}
            steps={patientSteps.map((step) => ({
              key: step.key,
              icon: step.icon,
              tone: step.tone,
              label: t(`patient.steps.${step.key}`),
            }))}
            cta={t('cta')}
            href={routes.search()}
          />
        </RoleCardMotion>
      </div>
    </section>
  );
}

/* Each step sits above the next, so a row entering from one row up comes
   out from under the one before; the words block, above them all, hides
   the first until it sets off. */
const stepDepth = ['z-4', 'z-3', 'z-2', 'z-1'];
/* Over the card, the steps lean right one after another, a third of a
   fast beat apart. */
const stepLean = [
  '',
  'delay-[calc(var(--duration-fast)/3)]',
  'delay-[calc(var(--duration-fast)/3*2)]',
  'delay-(--duration-fast)',
];
/* Over a step, its badge's tint (the same icon-badge.tsx paints) sweeps
   across the row from the left, as if the circle spread out, and the words
   take the tone's lightest shade that keeps 4.5:1 on that tint (measured:
   blue-500 8.4, green-700 4.7, orange-800 6.6, warning-800 5.3; the 600s
   and orange-700 fall short). */
const stepWords: Record<IconTone, string> = {
  blue: 'group-hover/step:text-primary',
  green: 'group-hover/step:text-green-700',
  orange: 'group-hover/step:text-orange-800',
  warning: 'group-hover/step:text-warning-800',
};

type RoleCardProps = {
  illustration: 'avatar-specialist' | 'avatar-patient';
  title: string;
  description: string;
  steps: {
    key: string;
    icon: Parameters<typeof IconBadge>[0]['icon'];
    tone: Parameters<typeof IconBadge>[0]['tone'];
    label: string;
  }[];
  cta: string;
  /** Where «Comenzar» leads this role. */
  href: Route;
};

function RoleCard({
  illustration,
  title,
  description,
  steps,
  cta,
  href,
}: RoleCardProps) {
  return (
    /* The hovers move `translate`, `rotate` and `scale` only, which the
       entrance (transform) never touches. `isolate` keeps the steps' depth
       inside the card, away from the header's. */
    <article
      data-piece="card"
      className="group/card relative isolate flex h-full cursor-pointer flex-col items-center gap-4 rounded-2xl bg-pure-white px-4 py-5 text-center shadow-md sm:px-6"
    >
      <Image
        data-piece="avatar"
        src={`/illustrations/landing/${illustration}.svg`}
        alt=""
        aria-hidden="true"
        width={104}
        height={104}
        className="size-24 transition-[translate,rotate] duration-base ease-house group-hover/card:-translate-y-1 group-hover/card:-rotate-6 lg:size-26"
      />
      {/* Opaque and above the steps: the first comes out from under it. */}
      <div
        data-piece="heading"
        className="relative z-10 flex w-full flex-col gap-1.5 bg-pure-white"
      >
        <h3 className="text-headline-sm font-bold text-pure-black lg:text-headline-md">
          {title}
        </h3>
        <p className="text-body-md text-grey-800 sm:text-body-lg">
          {description}
        </p>
      </div>
      <ol className="flex w-full flex-col gap-3">
        {steps.map((step, index) => (
          <li
            key={step.key}
            data-piece="step"
            className={cn(
              'relative transition-[translate] duration-base ease-house group-hover/card:translate-x-1',
              stepDepth[index],
              stepLean[index],
            )}
          >
            <div
              className={cn(
                'group/step relative isolate flex items-center gap-3 overflow-hidden rounded-lg bg-pure-white px-3 py-2.5 text-left shadow-md transition-[translate,box-shadow] duration-base ease-house hover:-translate-y-0.5 hover:shadow-lg',
                'before:absolute before:inset-0 before:-z-10 before:origin-left before:scale-x-0 before:transition-[scale] before:duration-slow before:ease-house hover:before:scale-x-100',
                toneFills[step.tone],
              )}
            >
              <IconBadge
                data-piece="badge"
                icon={step.icon}
                tone={step.tone}
                size="sm"
                className="transition-[scale] duration-base ease-house group-hover/step:scale-110"
              />
              <span
                className={cn(
                  'text-title-md font-semibold text-pure-black transition-colors duration-base ease-house sm:text-subtitle-s',
                  stepWords[step.tone],
                )}
              >
                {step.label}
              </span>
            </div>
          </li>
        ))}
      </ol>
      {/* Full height, as the mockup's 43 px, and a deeper hover than the
          primitive's one step (owner's request). */}
      <Button
        asChild
        data-piece="cta"
        block
        shape="soft"
        className="mt-auto hover:bg-blue-700"
      >
        <Link href={href}>{cta}</Link>
      </Button>
    </article>
  );
}
