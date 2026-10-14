'use client';

import type { Route } from 'next';

import Link from 'next/link';

import EventBusy from '@material-symbols/svg-400/rounded/event_busy.svg?svgr';
import HowToReg from '@material-symbols/svg-400/rounded/how_to_reg.svg?svgr';
import Stethoscope from '@material-symbols/svg-400/rounded/stethoscope.svg?svgr';
import Visibility from '@material-symbols/svg-400/rounded/visibility.svg?svgr';
import { useTranslations } from 'next-intl';

import { routes } from '@/app/lib/routes';

import { Button } from '@/app/ui/button';
import { StatusCard } from '@/app/ui/status-card';

/*
 * What the booking page says instead of its steps, each case in the app's
 * words where it has them: the sign-up to finish first, a specialist's
 * account, the owner's own profile, and a specialist nobody can book with.
 */

/** The app's «¡Un último paso para agendar tu cita!», before any step. */
export function FinishSignUpFirst({
  specialistName,
  signUpHref,
  profileHref,
}: {
  specialistName: string;
  signUpHref: Route;
  profileHref: Route;
}) {
  const t = useTranslations('search');
  return (
    <StatusCard
      icon={HowToReg}
      title={t('finishSignupToBookTitle')}
      description={t('finishSignupToBookDescription', {
        name: specialistName,
      })}
      viewHeading
    >
      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <Button asChild shape="soft" className="sm:flex-1">
          <Link href={signUpHref}>{t('finishMySignup')}</Link>
        </Button>
        <Button asChild variant="white" shape="soft" className="sm:flex-1">
          <Link href={profileHref}>{t('completeLater')}</Link>
        </Button>
      </div>
    </StatusCard>
  );
}

/**
 * A specialist's account books nothing (AGENTS.md §1: no page offers it to
 * them; the app does not let them either): the way to their panel, or to
 * another account.
 */
export function ForSpecialists({
  onSwitchAccount,
}: {
  onSwitchAccount: () => void;
}) {
  const t = useTranslations();
  return (
    <StatusCard
      icon={Stethoscope}
      title={t('appointments.book.forSpecialists')}
      description={t('appointments.book.forSpecialistsDescription')}
      viewHeading
    >
      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <Button asChild shape="soft" className="sm:flex-1">
          <Link href={routes.specialistHome()}>
            {t('appointments.book.goToPanel')}
          </Link>
        </Button>
        <Button
          variant="white"
          shape="soft"
          className="sm:flex-1"
          onClick={onSwitchAccount}
        >
          {t('auth.switchAccount')}
        </Button>
      </div>
    </StatusCard>
  );
}

/** The specialist on their own booking page: the app's preview notice (its words come from the server). */
export function OwnPreview({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <StatusCard
      icon={Visibility}
      title={title}
      description={description}
      viewHeading
    />
  );
}

/**
 * Nobody can book with this specialist from here: not active (the API
 * answers 404, the app's words), no office published, or a specialty the
 * catalog does not know (the API asks for one, REDOC-251).
 */
export function BookingUnavailable({
  reason,
}: {
  reason: 'inactive' | 'noOffices' | 'noSpecialty';
}) {
  const t = useTranslations();
  const words = {
    inactive: {
      title: t('search.specialistUnavailableTitle'),
      description: t('search.specialistUnavailableDescription'),
    },
    noOffices: {
      title: t('appointments.book.unavailable'),
      description: t('appointments.book.noOffices'),
    },
    noSpecialty: {
      title: t('appointments.book.unavailable'),
      description: t('appointments.book.unavailableDescription'),
    },
  }[reason];
  return (
    <StatusCard
      icon={EventBusy}
      title={words.title}
      description={words.description}
      viewHeading
    />
  );
}
