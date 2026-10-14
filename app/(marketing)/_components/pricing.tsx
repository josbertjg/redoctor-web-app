import type { Route } from 'next';

import Link from 'next/link';

import CheckCircleFill from '@material-symbols/svg-400/rounded/check_circle-fill.svg?svgr';
import Paid from '@material-symbols/svg-400/rounded/paid.svg?svgr';
import WorkspacePremium from '@material-symbols/svg-400/rounded/workspace_premium.svg?svgr';
import { useFormatter, useTranslations } from 'next-intl';

import {
  planBenefits,
  type PlanBenefit,
} from '@/app/lib/billing/plan-benefits';
import type { LandingPlans } from '@/app/lib/data/plans';
import { routes } from '@/app/lib/routes';
import { planTier } from '@/app/lib/schemas/billing';
import { cn } from '@/app/lib/utils';

import { Button } from '@/app/ui/button';
import { EmptyState } from '@/app/ui/empty-state';
import { Icon } from '@/app/ui/icons';

import { Swirl } from './decor';
import { LabelChip } from './label-chip';
import { PricingMotion } from './pricing-motion';
import { accentOnWhite } from './rich';
import { SectionHeading } from './section-heading';
import { landingSections, samplePlans } from '../_data/landing-content';

/** One plan as the landing shows it, whichever source it came from. */
type PricingCard = {
  key: string;
  name: string;
  description: string | null;
  /** Dollars a month: the amount counts up and is written «36,99». */
  price: number;
  featured: boolean;
  benefits: string[];
  href: Route;
};

/*
 * «Elige el plan ideal» (Figma): three plans in a white container, the
 * recommended one in brand blue with its «Recomendado» tag. The plans are
 * the API's when it answers the landing (app/lib/data/plans.ts): the name,
 * the monthly price, the description and what each one includes, derived
 * from its limits as the payment derives it; the professional plan wears
 * «Recomendado», since the API ranks none; and «Seleccionar plan» opens the
 * payment with that plan chosen. While the API keeps its plans for
 * signed-in specialists, the mockup's stand in and the button opens the
 * payment's own list. The mockup's update of 2026-10-08 (bigger price,
 * words and benefits, the visible tag) is in; its slips are not: the second
 * plan keeps its own name and the price keeps the locale's decimal comma.
 * The pieces carry `data-piece` for their entrance (pricing-motion.tsx):
 * the recommended plan sits above its neighbours, which slide out from
 * behind it, and each amount counts up in its own span.
 */
export function Pricing({ plans }: { plans: LandingPlans }) {
  const t = useTranslations('landing.pricing');
  const tBenefits = useTranslations('billing.plans.benefits');
  const format = useFormatter();

  const words = (benefit: PlanBenefit) =>
    benefit.key === 'manyClinics'
      ? tBenefits('manyClinics', { count: benefit.count })
      : tBenefits(benefit.key);

  const cards: PricingCard[] =
    plans.status === 'offered'
      ? plans.plans.map((plan) => ({
          key: plan.slug,
          name: plan.name,
          description: plan.description ?? null,
          price: plan.price.amount.amount / 100,
          featured: planTier(plan.slug) === 'silver',
          benefits: planBenefits(plan).map(words),
          href: routes.subscriptionPay(plan.slug),
        }))
      : plans.status === 'private'
        ? samplePlans.map((plan) => ({
            key: plan.key,
            name: t(`plans.${plan.key}.name`),
            description: t(`plans.${plan.key}.description`),
            price: plan.price,
            featured: plan.featured,
            benefits: planBenefits(plan).map(words),
            href: routes.subscriptionPlans(),
          }))
        : [];

  return (
    <section
      id={landingSections.pricing}
      aria-labelledby="pricing-title"
      className="scroll-mt-28 px-gutter py-10 lg:py-16"
    >
      <PricingMotion
        plans={cards.map(({ key, price, featured }) => ({
          key,
          price,
          featured,
        }))}
      >
        <div
          data-piece="box"
          className="relative mx-auto max-w-landing overflow-hidden rounded-2xl bg-pure-white px-5 py-12 shadow-md sm:px-10 lg:px-16 lg:py-20"
        >
          <Swirl
            variant="pricing"
            className="top-[-30%] right-[-18%] w-[50%]"
          />
          <div className="relative">
            <SectionHeading
              id="pricing-title"
              chip={{ icon: Paid, label: t('chip') }}
              title={t.rich('title', accentOnWhite)}
              description={t('description')}
              tone="on-white"
              pieces={{
                chip: 'chip',
                title: 'title',
                description: 'description',
              }}
            />
            {cards.length === 0 ? (
              <div className="mx-auto mt-12 max-w-md lg:mt-16">
                <EmptyState
                  icon={WorkspacePremium}
                  title={t('unavailable.title')}
                  description={t('unavailable.description')}
                  headingLevel={3}
                />
              </div>
            ) : (
              <ul className="isolate mx-auto mt-12 grid max-w-5xl gap-6 lg:mt-16 lg:grid-cols-3 lg:gap-8">
                {cards.map((card) => (
                  <li
                    key={card.key}
                    data-piece={`card-${card.key}`}
                    className={cn('relative', card.featured && 'z-10')}
                  >
                    <article
                      className={cn(
                        'flex h-full cursor-pointer flex-col gap-8 rounded-xl px-7 py-6 shadow-md transition-transform duration-base ease-house hover:-translate-y-1',
                        card.featured
                          ? 'bg-primary text-pure-white'
                          : 'bg-pure-white text-pure-black',
                      )}
                    >
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                          <h3 className="text-subtitle-s font-bold">
                            {card.name}
                          </h3>
                          {card.featured ? (
                            <LabelChip data-piece="tag">
                              {t('featured')}
                            </LabelChip>
                          ) : null}
                        </div>
                        <p className="flex items-baseline gap-2.5">
                          <span className="text-title-xxl font-bold">
                            {/* The figure counts up from zero as the card lands:
                                readers hear the price, never the count. */}
                            <span className="sr-only">
                              $&nbsp;
                              {format.number(card.price, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                            <span aria-hidden="true">
                              $&nbsp;
                              <span data-piece={`amount-${card.key}`}>
                                {format.number(card.price, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            </span>
                          </span>
                          <span
                            className={cn(
                              'text-subtitle-m font-medium',
                              card.featured ? 'text-blue-100' : 'text-grey-600',
                            )}
                          >
                            {t('perMonth')}
                          </span>
                        </p>
                        {card.description ? (
                          <p
                            className={cn(
                              'text-body-xs font-medium',
                              card.featured ? 'text-blue-100' : 'text-grey-600',
                            )}
                          >
                            {card.description}
                          </p>
                        ) : null}
                        <h4 className="mt-4 text-body-xs font-semibold">
                          {t('featuresTitle')}
                        </h4>
                        <ul className="flex flex-col gap-1.5">
                          {card.benefits.map((benefit, index) => (
                            <li
                              key={benefit}
                              data-piece={`feature-${String(index + 1)}`}
                              className="flex items-start gap-2.5 text-body-xs"
                            >
                              <Icon
                                icon={CheckCircleFill}
                                size={16}
                                className="mt-px"
                              />
                              {benefit}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <Button
                        asChild
                        data-piece="cta"
                        block
                        shape="soft"
                        size="small"
                        variant={card.featured ? 'white' : 'primary'}
                        className="mt-auto"
                      >
                        <Link href={card.href}>{t('cta')}</Link>
                      </Button>
                    </article>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </PricingMotion>
    </section>
  );
}
