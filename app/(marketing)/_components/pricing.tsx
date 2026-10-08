import CheckCircleFill from '@material-symbols/svg-400/rounded/check_circle-fill.svg?svgr';
import Paid from '@material-symbols/svg-400/rounded/paid.svg?svgr';
import { useFormatter, useTranslations } from 'next-intl';

import { cn } from '@/app/lib/utils';

import { Button } from '@/app/ui/button';
import { Icon } from '@/app/ui/icons';

import { Swirl } from './decor';
import { LabelChip } from './label-chip';
import { Reveal } from './reveal';
import { accentOnWhite } from './rich';
import { SectionHeading } from './section-heading';
import { landingSections, planFeatures, plans } from '../_data/landing-content';

/*
 * «Elige el plan ideal» (Figma): three plans in a white container, the
 * middle one in brand blue with its «Recomendado» tag. Sample plans and
 * prices for the visual stage; the landing doc keeps prices off the page
 * while the app links here (AGENTS.md §6), a decision that stays open. The
 * mockup's update of 2026-10-08 (bigger price, words and benefits, the
 * visible tag) is in; its slips are not: the second plan keeps its own
 * name and the price keeps the locale's decimal comma.
 */
export function Pricing() {
  const t = useTranslations('landing.pricing');
  const format = useFormatter();

  return (
    <section
      id={landingSections.pricing}
      aria-labelledby="pricing-title"
      className="scroll-mt-28 px-gutter py-10 lg:py-16"
    >
      <Reveal className="relative mx-auto max-w-landing overflow-hidden rounded-2xl bg-pure-white px-5 py-12 shadow-md sm:px-10 lg:px-16 lg:py-20">
        <Swirl variant="pricing" className="top-[-30%] right-[-18%] w-[50%]" />
        <div className="relative">
          <SectionHeading
            id="pricing-title"
            chip={{ icon: Paid, label: t('chip') }}
            title={t.rich('title', accentOnWhite)}
            description={t('description')}
            tone="on-white"
          />
          <ul className="mx-auto mt-12 grid max-w-5xl gap-6 lg:mt-16 lg:grid-cols-3 lg:gap-8">
            {plans.map((plan) => (
              <li key={plan.key}>
                <article
                  className={cn(
                    'flex h-full cursor-pointer flex-col gap-8 rounded-xl px-7 py-6 shadow-md transition-transform duration-base ease-house hover:-translate-y-1',
                    plan.featured
                      ? 'bg-primary text-pure-white'
                      : 'bg-pure-white text-pure-black',
                  )}
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                      <h3 className="text-subtitle-s font-bold">
                        {t(`plans.${plan.key}.name`)}
                      </h3>
                      {plan.featured ? (
                        <LabelChip>{t('featured')}</LabelChip>
                      ) : null}
                    </div>
                    <p className="flex items-baseline gap-2.5">
                      <span className="text-title-xxl font-bold">
                        $&nbsp;
                        {format.number(plan.price, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                      <span
                        className={cn(
                          'text-subtitle-m font-medium',
                          plan.featured ? 'text-blue-100' : 'text-grey-600',
                        )}
                      >
                        {t('perMonth')}
                      </span>
                    </p>
                    <p
                      className={cn(
                        'text-body-xs font-medium',
                        plan.featured ? 'text-blue-100' : 'text-grey-600',
                      )}
                    >
                      {t(`plans.${plan.key}.description`)}
                    </p>
                    <h4 className="mt-4 text-body-xs font-semibold">
                      {t('featuresTitle')}
                    </h4>
                    <ul className="flex flex-col gap-1.5">
                      {planFeatures.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-2.5 text-body-xs"
                        >
                          <Icon
                            icon={CheckCircleFill}
                            size={16}
                            className="mt-px"
                          />
                          {t(`features.${feature}`)}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {/* TODO(M13): the plan choice lives in the payment flow. */}
                  <Button
                    block
                    shape="soft"
                    size="small"
                    variant={plan.featured ? 'white' : 'primary'}
                    className="mt-auto"
                  >
                    {t('cta')}
                  </Button>
                </article>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </section>
  );
}
