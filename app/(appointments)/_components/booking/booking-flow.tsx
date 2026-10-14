'use client';

import type { ReactNode } from 'react';

import type { Route } from 'next';

import { useSearchParams } from 'next/navigation';

import Login from '@material-symbols/svg-400/rounded/login.svg?svgr';
import { useTranslations } from 'next-intl';

import {
  canUseSpecialistArea,
  mustFinishPatientSignup,
  needsSignUp,
} from '@/app/lib/auth/account';
import { routes } from '@/app/lib/routes';

import { AccountErrorState } from '@/app/ui/auth/account-error-state';
import { SignInButtons } from '@/app/ui/auth/sign-in-buttons';
import { SignInLegalNote } from '@/app/ui/auth/sign-in-legal-note';
import { BackLink } from '@/app/ui/back-link';
import { StatusCard } from '@/app/ui/status-card';

import { useSession } from '@/app/hooks/use-session';
import { useSignInTracking } from '@/app/hooks/use-sign-in-tracking';

import { BookingFrame } from './booking-frame';
import {
  BookingUnavailable,
  FinishSignUpFirst,
  ForSpecialists,
  OwnPreview,
} from './booking-notices';
import { BookingSkeleton } from './booking-skeleton';
import { BookingSpecialistCard } from './booking-specialist';
import { BookingSteps } from './booking-steps';

import type { BookingSpecialist } from './booking-types';

type BookingFlowProps = {
  specialist: BookingSpecialist;
  /** The specialty the API asks for, found in the catalog; null when it is not there. */
  specialtyId: string | null;
  /** The app's preview notice, for the specialist on their own page (its words, from the server). */
  ownerNotice: { title: string; description: string };
};

/*
 * `/book/{specialistId}` (M15), the app's booking: what the API needs is
 * checked first — an office, the specialty —, then the session, asked for
 * right here (one tap, AGENTS.md §1), as on `/a`. A specialist's account
 * books nothing; a patient whose sign-up is not finished finishes it first
 * (the app's «¡Un último paso…!») and comes back. Then the four steps.
 */
export function BookingFlow({
  specialist,
  specialtyId,
  ownerNotice,
}: BookingFlowProps) {
  const t = useTranslations();
  const session = useSession();
  const onSignedIn = useSignInTracking();
  const searchParams = useSearchParams();
  const { account, user } = session;
  const namedOffice = specialist.offices.find(
    (office) => office.id === searchParams.get('office'),
  );
  // A built path: typed routes check literals, not ids (`as Route`, as elsewhere).
  const profile = routes.specialist(specialist.id) as Route;

  const header = (
    <>
      <BackLink href={profile} label={t('appointments.book.backToProfile')} />
      <h1 className="text-headline-sm text-text-primary">
        {t('search.bookAppointment')}
      </h1>
      <BookingSpecialistCard specialist={specialist} />
    </>
  );
  const frame = (content: ReactNode) => (
    <BookingFrame header={header}>{content}</BookingFrame>
  );

  if (specialist.offices.length === 0) {
    return frame(<BookingUnavailable reason="noOffices" />);
  }
  if (specialtyId === null) {
    return frame(<BookingUnavailable reason="noSpecialty" />);
  }
  if (session.status === 'resolving') return frame(<BookingSkeleton />);
  if (session.status === 'signed-out') {
    return frame(
      <StatusCard
        icon={Login}
        title={t('appointments.book.signIn')}
        description={t('search.noAuthDescription')}
      >
        <SignInButtons onSignedIn={onSignedIn} />
        <SignInLegalNote />
      </StatusCard>,
    );
  }
  if (session.accountStatus === 'error') {
    return frame(<AccountErrorState canSwitchAccount />);
  }
  if (user === null || account === null) return frame(<BookingSkeleton />);

  if (canUseSpecialistArea(account)) {
    return frame(
      account.specialist.id === specialist.id ? (
        <OwnPreview {...ownerNotice} />
      ) : (
        <ForSpecialists
          onSwitchAccount={() => {
            void session.signOut();
          }}
        />
      ),
    );
  }
  if (needsSignUp(account) || mustFinishPatientSignup(account)) {
    return frame(
      <FinishSignUpFirst
        specialistName={specialist.name}
        signUpHref={routes.signUp(
          routes.book(
            specialist.id,
            namedOffice?.id,
            searchParams.get('date') ?? undefined,
          ),
        )}
        profileHref={profile}
      />,
    );
  }

  return (
    <BookingSteps
      header={header}
      specialist={specialist}
      specialtyId={specialtyId}
      user={user}
      savedUnder={user.email ?? account.email}
    />
  );
}
