import Image from 'next/image';

import CheckCircle from '@material-symbols/svg-400/rounded/check_circle.svg?svgr';
import { useTranslations } from 'next-intl';

import { cn } from '@/app/lib/utils';

import { Reveal } from './reveal';
import { accentOnBlue } from './rich';
import { SectionHeading } from './section-heading';
import { landingSections, trustSteps } from '../_data/landing-content';

/*
 * «Sí, puedes confiar» (Figma): the verification in four numbered cards,
 * each with its illustration peeking from the bottom edge. The words and
 * the picture have separate areas, one under the other, so a longer line
 * makes the card taller instead of running under the picture.
 */
export function Trust() {
  const t = useTranslations('landing.trust');

  return (
    <section
      id={landingSections.trust}
      aria-labelledby="trust-title"
      className="scroll-mt-28 px-gutter py-16 lg:py-24"
    >
      <div className="mx-auto grid max-w-landing items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-16">
        <Reveal>
          <SectionHeading
            id="trust-title"
            chip={{ icon: CheckCircle, label: t('chip') }}
            title={t.rich('title', accentOnBlue)}
            description={t('description')}
            tone="on-blue"
            align="start"
          />
        </Reveal>
        <Reveal delay="short">
          <ol
            aria-label={t('stepsLabel')}
            className="grid gap-5 sm:grid-cols-2"
          >
            {trustSteps.map((step, index) => (
              <li
                key={step.key}
                className="flex flex-col overflow-hidden rounded-2xl bg-pure-white shadow-sm"
              >
                <div className="flex items-start gap-3 p-5 pb-3">
                  <span
                    aria-hidden="true"
                    className="flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-label-lg text-primary shadow-sm"
                  >
                    {index + 1}
                  </span>
                  <p className="text-body-xs font-semibold text-pretty text-primary">
                    {t(`steps.${step.key}`)}
                  </p>
                </div>
                {/* The picture area: as tall as the mockup leaves under two
                    lines, and the card's edge cuts what sticks out. */}
                <div className="relative mt-auto aspect-291/112">
                  <Image
                    src={`/illustrations/landing/${step.illustration}.svg`}
                    alt=""
                    aria-hidden="true"
                    width={step.width}
                    height={step.height}
                    className={cn(
                      'absolute left-1/2 h-auto -translate-x-1/2',
                      step.placement,
                    )}
                  />
                </div>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}
