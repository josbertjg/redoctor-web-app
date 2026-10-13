'use client';

import { useId } from 'react';

import type { Route } from 'next';

import Link from 'next/link';

import Schedule from '@material-symbols/svg-400/rounded/schedule.svg?svgr';
import Visibility from '@material-symbols/svg-400/rounded/visibility.svg?svgr';
import VisibilityOff from '@material-symbols/svg-400/rounded/visibility_off.svg?svgr';
import Warning from '@material-symbols/svg-400/rounded/warning.svg?svgr';
import { useTranslations } from 'next-intl';

import type { ProfileVisibility } from '@/app/lib/auth/account';
import { routes } from '@/app/lib/routes';
import { cn } from '@/app/lib/utils';

import { OpenInAppButton } from '@/app/ui/app-bridge/open-in-app-button';
import { Button } from '@/app/ui/button';
import { Icon } from '@/app/ui/icons';
import { StateChip } from '@/app/ui/state-chip';

/** The app's tones for the profile's state (its badge in the app bar). */
const tones = {
  active: {
    chip: 'positive',
    icon: Visibility,
    circle: 'bg-success-light text-green-700',
  },
  review: {
    chip: 'info',
    icon: Schedule,
    circle: 'bg-info-light text-primary',
  },
  actionNeeded: {
    chip: 'error',
    icon: Warning,
    circle: 'bg-error-light text-error-700',
  },
  inactive: {
    chip: 'neutral',
    icon: VisibilityOff,
    circle: 'bg-surface-variant text-text-secondary',
  },
} as const;

type Tone = keyof typeof tones;

/** What can be done about it: a page of the web, or the app (`app`). */
type StatusAction = { href: Route; label: string } | 'app' | null;

type ProfileStatus = {
  tone: Tone;
  title: string;
  description: string;
  action: StatusAction;
};

/*
 * The first thing the API finds missing (`visibilityStatus`), told as the
 * app's «Estado de mi perfil» tells it: what is in review, what was
 * rejected, the step still to take. What the web can do leads there (the
 * reasons of a rejection, the plans, the payment in review); what only
 * the app does opens it.
 */
function useProfileStatus(
  visibility: ProfileVisibility,
  facts: { rejectedCount: number; onlyInactiveOffices: boolean },
): ProfileStatus {
  const t = useTranslations();
  const step = (
    key: 'credentials' | 'office' | 'activateOffice' | 'schedules' | 'pricing',
  ): ProfileStatus => ({
    tone: 'inactive',
    title: t(`profile.activation.steps.${key}.title`),
    description: t(`profile.activation.steps.${key}.description`),
    action: 'app',
  });

  switch (visibility) {
    case 'visible':
      return {
        tone: 'active',
        title: t('profile.activation.active.title'),
        description: t('profile.activation.active.description'),
        action: null,
      };
    case 'specialtiesPending':
      return {
        tone: 'review',
        title: t('profile.activation.underReview.title'),
        description: t('profile.activation.underReview.description'),
        action: { href: routes.specialties(), label: t('mySpecialties.title') },
      };
    case 'specialtiesRejected':
      return {
        tone: 'actionNeeded',
        title: t('profile.activation.rejected.title'),
        description:
          facts.rejectedCount > 1
            ? t('profile.activation.rejected.descriptionPlural')
            : t('profile.activation.rejected.description'),
        action: {
          href: routes.specialties(),
          label: t('profile.activation.specialtiesRejected.action'),
        },
      };
    case 'verifyingSubscriptionPayment':
      return {
        tone: 'review',
        title: t('profile.activation.verifyingPayment.title'),
        description: t('profile.activation.verifyingPayment.description'),
        action: {
          href: routes.subscription(),
          label: t('billing.mySubscription.entryPoint'),
        },
      };
    case 'noSubscription':
      return {
        tone: 'inactive',
        title: t('profile.activation.steps.subscription.title'),
        description: t('profile.activation.steps.subscription.description'),
        action: {
          href: routes.subscriptionPay(),
          label: t('profile.activation.steps.subscription.action'),
        },
      };
    case 'profileIncomplete':
    case 'noSpecialties':
      return step('credentials');
    case 'noOffices':
      return step(facts.onlyInactiveOffices ? 'activateOffice' : 'office');
    case 'noSchedules':
      return step('schedules');
    case 'noMotivesAndPrices':
      return step('pricing');
  }
}

const toneLabels = {
  active: 'profile.status.active',
  review: 'profile.status.waitingAdminReview',
  actionNeeded: 'profile.status.actionNeeded',
  inactive: 'profile.status.inactive',
} as const;

/*
 * Whether patients find the specialist in the search and, when they do
 * not, why: the news of the email «Perfil no visible», first on the page.
 */
export function ProfileStatusCard({
  visibility,
  rejectedCount,
  onlyInactiveOffices,
}: {
  visibility: ProfileVisibility;
  rejectedCount: number;
  /** Offices exist and none is active: the step is to turn one on. */
  onlyInactiveOffices: boolean;
}) {
  const t = useTranslations();
  const headingId = useId();
  const status = useProfileStatus(visibility, {
    rejectedCount,
    onlyInactiveOffices,
  });
  const tone = tones[status.tone];
  const { action } = status;

  return (
    <section
      aria-labelledby={headingId}
      className="flex animate-fade-up flex-col gap-4 rounded-2xl bg-pure-white p-5 shadow-md"
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-full',
            tone.circle,
          )}
        >
          <Icon icon={tone.icon} size={24} />
        </span>
        <div className="flex min-w-0 flex-col items-start gap-1.5">
          <StateChip tone={tone.chip}>{t(toneLabels[status.tone])}</StateChip>
          <h2 id={headingId} className="text-title-md text-text-primary">
            {status.title}
          </h2>
          <p className="text-body-md text-text-secondary">
            {status.description}
          </p>
        </div>
      </div>
      {action === 'app' ? (
        // A computer has no app to open: the card at the foot of the page says how.
        <OpenInAppButton
          path={routes.specialistProfile()}
          desktop="none"
          className="sm:items-start"
        />
      ) : action ? (
        <Button
          asChild
          variant="white"
          size="small"
          shape="soft"
          className="self-start"
        >
          <Link href={action.href}>{action.label}</Link>
        </Button>
      ) : null}
    </section>
  );
}
