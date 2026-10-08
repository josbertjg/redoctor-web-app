import Image from 'next/image';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/ui/button';

import { Plus, Swirl } from './decor';
import { IconBadge } from './icon-badge';
import { Reveal } from './reveal';
import { accentOnBlue } from './rich';
import {
  landingSections,
  patientSteps,
  specialistSteps,
} from '../_data/landing-content';

/*
 * «Así de simple» (Figma): one card per role with its four steps. The copy
 * of the steps is the mockup's; the landing doc's longer version waits for
 * the decision on the final copy.
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
        <Reveal>
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
          />
        </Reveal>
        <Reveal delay="short">
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
          />
        </Reveal>
      </div>
    </section>
  );
}

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
};

function RoleCard({
  illustration,
  title,
  description,
  steps,
  cta,
}: RoleCardProps) {
  return (
    <article className="flex h-full flex-col items-center gap-4 rounded-2xl bg-pure-white px-4 py-5 text-center shadow-md sm:px-6">
      <Image
        src={`/illustrations/landing/${illustration}.svg`}
        alt=""
        aria-hidden="true"
        width={104}
        height={104}
        className="size-24 lg:size-26"
      />
      <div className="flex flex-col gap-1.5">
        <h3 className="text-headline-sm font-bold text-pure-black lg:text-headline-md">
          {title}
        </h3>
        <p className="text-body-md text-grey-800 sm:text-body-lg">
          {description}
        </p>
      </div>
      <ol className="flex w-full flex-col gap-3">
        {steps.map((step) => (
          <li
            key={step.key}
            className="flex items-center gap-3 rounded-lg bg-pure-white px-3 py-2.5 text-left shadow-md"
          >
            <IconBadge icon={step.icon} tone={step.tone} size="sm" />
            <span className="text-title-md font-semibold text-pure-black sm:text-subtitle-s">
              {step.label}
            </span>
          </li>
        ))}
      </ol>
      {/* TODO(M2/M11): the specialist opens the app, the patient signs in. */}
      <Button block shape="soft" size="small" className="mt-auto">
        {cta}
      </Button>
    </article>
  );
}
