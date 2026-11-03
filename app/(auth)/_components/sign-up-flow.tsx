'use client';

import { useEffect, useState, type ReactNode } from 'react';

import type { Route } from 'next';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import Person from '@material-symbols/svg-400/rounded/person.svg?svgr';
import Stethoscope from '@material-symbols/svg-400/rounded/stethoscope.svg?svgr';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { isApplePrivateRelayEmail } from '@/app/lib/auth/account';
import { destinationAfterSignIn } from '@/app/lib/auth/destination';
import {
  invitationOf,
  planSignUp,
  signUpPurposeOf,
  signUpRoleOf,
  type SignUpPlan,
  type SignUpPurpose,
  type SignUpRole,
} from '@/app/lib/auth/sign-up';
import type { SessionUser } from '@/app/lib/firebase/client';
import { identityKeys } from '@/app/lib/queries/identity-keys';
import { invitationQueryOptions } from '@/app/lib/queries/invitations';
import { routes } from '@/app/lib/routes';
import { personalDataFrom, toInvitation } from '@/app/lib/schemas/invitations';

import { AccountErrorState } from '@/app/ui/auth/account-error-state';
import { useSignInArrival } from '@/app/ui/auth/use-sign-in-arrival';
import { Button } from '@/app/ui/button';
import { moveStep } from '@/app/ui/motion/directions';
import { wipeScreen } from '@/app/ui/motion/screen-wipe';
import { StepTransition } from '@/app/ui/motion/view-transitions';
import { toast } from '@/app/ui/toast';

import { useFocusHeading } from '@/app/hooks/use-focus-heading';
import type { Session } from '@/app/hooks/use-session';

import { AuthCard, authLinkClass, authSurfaceClass } from './auth-card';
import { CreateAccountStep } from './create-account-step';
import { PatientSignUpForm } from './patient-sign-up-form';
import { RoleChoice } from './role-choice';
import { SignUpDone } from './sign-up-done';
import { SignUpSkeleton } from './sign-up-skeleton';
import { SpecialistSignUpForm } from './specialist-sign-up-form';

type SignUpFlowProps = {
  /** A same-origin path to return to, already checked by the page. */
  redirect: string | null;
  /** The way to the app for a specialist whose sign-up is still open (rendered on the server). */
  finishApp: ReactNode;
  /** The same, the moment a specialist created the account here. */
  createdApp: ReactNode;
};

/*
 * `/sign-up` (M3, the designer's frames of 2026-10-30): it starts as the
 * app's does — who the person is, then the account, then the form of the
 * role chosen — and what the API says of the account decides each step
 * (app/lib/auth/sign-up.ts). The role lives in the address (`?as=`), so the
 * browser's back returns to «¿Quién eres?»; a stranger creates the account
 * in place, under the blue wipe, and the form comes next on the same page.
 * A patient goes back to where they were going; a specialist, once the
 * account exists, to the app, where their specialties are registered.
 * Claiming an invitation that is theirs (M4: `/i/{token}?for=self`), the
 * form starts from the invitation's data, as the app's prefill does.
 */
export function SignUpFlow(props: SignUpFlowProps) {
  // Held while the colour covers an in-place sign-in (`useSignInArrival`).
  const { session, onSignedIn } = useSignInArrival();
  const { status, account } = session;
  const known =
    status === 'signed-out' || (status === 'signed-in' && account !== null);

  // The steps mount once the person is known, so arriving keeps the
  // browser's own focus: only the steps the person takes move it.
  if (
    !known &&
    !(status === 'signed-in' && session.accountStatus === 'error')
  ) {
    return <SignUpSkeleton />;
  }
  return <SignUpSteps {...props} session={session} onSignedIn={onSignedIn} />;
}

function SignUpSteps({
  redirect,
  finishApp,
  createdApp,
  session,
  onSignedIn,
}: SignUpFlowProps & {
  session: Session;
  onSignedIn: ReturnType<typeof useSignInArrival>['onSignedIn'];
}) {
  const t = useTranslations();
  const router = useRouter();
  const queryClient = useQueryClient();
  // Null outside the App Router (a component rendered on its own).
  const searchParams = useSearchParams() as URLSearchParams | null;
  const role = signUpRoleOf(searchParams?.get('as'));
  /** The sign-up just ended here: its last word stays whatever `/me` says next. */
  const [finished, setFinished] = useState<SignUpRole | null>(null);

  const { status, account, accountStatus } = session;
  const purpose = signUpPurposeOf(redirect);
  const claim = invitationOf(redirect);
  const invitation = useQuery({
    ...invitationQueryOptions(claim?.token ?? ''),
    enabled: claim?.forSelf === true && account !== null,
  });

  const plan = planSignUp(account, redirect, role);
  const leaving = plan.step === 'done' && finished === null;

  useEffect(() => {
    if (!leaving || account === null) return;
    router.replace(destinationAfterSignIn(account, redirect) as Route);
  }, [leaving, account, redirect, router]);

  /** Who the person says they are, in the address: forward to a role, back to the roles. */
  const chooseRole = (next: SignUpRole | null) => {
    moveStep(next === null ? 'back' : 'forward', () => {
      window.history.pushState(
        null,
        '',
        routes.signUp(redirect ?? undefined, next ?? undefined),
      );
    });
  };

  /** The end is a big moment: «¡Todo listo!» arrives under the green wipe (AGENTS.md §8, rule 13). */
  const finish = (who: SignUpRole, signedUp: SessionUser) => {
    void wipeScreen({
      tone: 'success',
      // The last word first, then the account read again: a fresh account
      // on a page that has not finished would move it away.
      whileCovered: async () => {
        setFinished(who);
        await queryClient.invalidateQueries({
          queryKey: identityKeys.me(signedUp.id),
        });
      },
    });
  };

  const failed = status === 'signed-in' && accountStatus === 'error';
  // What moves the focus: a step, never the data a step waits for.
  const stepKey = failed ? 'error' : (finished ?? stepName(plan));
  const step = useFocusHeading(stepKey);

  let content: ReactNode;
  if (failed) {
    content = (
      <AccountErrorState
        headingLevel={1}
        canSwitchAccount
        className={authSurfaceClass}
      />
    );
  } else if (finished === 'patient') {
    content = (
      <SignUpDone
        purpose={purpose}
        onContinue={() => {
          router.replace((redirect ?? routes.home()) as Route);
        }}
      />
    );
  } else if (finished === 'specialist') {
    content = (
      <div className="flex w-full flex-col items-center gap-4">
        {createdApp}
        <Button asChild variant="white" shape="soft">
          <Link href={routes.specialistHome()}>{t('signUp.goToPanel')}</Link>
        </Button>
      </div>
    );
  } else if (
    plan.step === 'done' ||
    (claim?.forSelf === true && account !== null && invitation.isPending)
  ) {
    // On its way out (`leaving`), or the invitation's data on its way.
    content = <SignUpSkeleton />;
  } else {
    content = (
      <SignUpStep
        plan={plan}
        session={session}
        redirect={redirect}
        purpose={purpose}
        defaults={
          invitation.data
            ? personalDataFrom(toInvitation(invitation.data))
            : undefined
        }
        finishApp={finishApp}
        chooseRole={chooseRole}
        onSignedIn={onSignedIn}
        onFinished={finish}
        backToRoles={role !== null && purpose === null}
      />
    );
  }

  return (
    // `contents`: a handle for the focus, no box of its own.
    <div ref={step} className="contents">
      <StepTransition step={stepKey}>{content}</StepTransition>
    </div>
  );
}

/** A step's name for the transitions and the focus: a plan, by the part it shows. */
function stepName(plan: SignUpPlan): string {
  switch (plan.step) {
    case 'create':
      return `create:${plan.role}`;
    case 'patient':
      return `patient:${String(plan.register)}:${String(plan.personalData)}`;
    default:
      return plan.step;
  }
}

type SignUpStepProps = {
  plan: Exclude<SignUpPlan, { step: 'done' }>;
  session: Session;
  redirect: string | null;
  purpose: SignUpPurpose | null;
  /** The invitation's data, when the appointment is the person's own. */
  defaults: ReturnType<typeof personalDataFrom> | undefined;
  finishApp: ReactNode;
  chooseRole: (role: SignUpRole | null) => void;
  onSignedIn: ReturnType<typeof useSignInArrival>['onSignedIn'];
  onFinished: (who: SignUpRole, user: SessionUser) => void;
  /** The role was chosen here: its form goes back to «¿Quién eres?». */
  backToRoles: boolean;
};

function SignUpStep({
  plan,
  session,
  redirect,
  purpose,
  defaults,
  finishApp,
  chooseRole,
  onSignedIn,
  onFinished,
  backToRoles,
}: SignUpStepProps) {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const { user } = session;
  const back = backToRoles
    ? () => {
        chooseRole(null);
      }
    : undefined;

  const notice =
    user !== null && isApplePrivateRelayEmail(user.email) ? (
      <PrivateEmailNotice
        onSwitch={() => {
          void session.signOut();
        }}
      />
    ) : null;

  switch (plan.step) {
    case 'choose-role':
      return (
        <RoleChoice
          onChoose={chooseRole}
          notice={notice}
          footer={
            user === null ? (
              <p>
                {t('auth.alreadyHaveAccount')}{' '}
                <Link
                  href={routes.signIn(redirect ?? undefined)}
                  className={authLinkClass}
                >
                  {t('auth.signInLink')}
                </Link>
              </p>
            ) : undefined
          }
        />
      );
    case 'create':
      return (
        <CreateAccountStep
          role={plan.role}
          redirect={redirect}
          onBack={
            plan.canGoBack
              ? () => {
                  chooseRole(null);
                }
              : undefined
          }
          onSignedIn={onSignedIn}
        />
      );
    case 'specialist-in-app':
      return finishApp;
    case 'specialist':
      // A brand-new account: there is a user by now.
      if (user === null) return null;
      return (
        <AuthCard
          icon={Stethoscope}
          title={t('signUp.createTitle.specialist')}
          description={t('signUp.createDescription.specialist')}
          onBack={back}
        >
          {notice}
          <div className="mt-2">
            <SpecialistSignUpForm
              user={user}
              onDone={() => {
                onFinished('specialist', user);
              }}
            />
          </div>
        </AuthCard>
      );
    case 'patient': {
      if (user === null) return null;
      const parts = {
        register: plan.register,
        personalData: plan.personalData,
      };
      const booking = purpose === 'book';
      const title = !parts.register
        ? t('finishPatientSignup.title')
        : parts.personalData
          ? t(booking ? 'signUp.bookTitle' : 'signUp.claimTitle')
          : t('signUp.createTitle.patient');
      const prefilled =
        defaults !== undefined && Object.keys(defaults).length > 0;
      const description = !parts.personalData
        ? t('signUp.createDescription.patient')
        : booking
          ? t('finishPatientSignup.toBook')
          : t(
              prefilled
                ? 'finishPatientSignup.toClaimPrefilled'
                : 'finishPatientSignup.toClaim',
            );
      return (
        <AuthCard
          icon={Person}
          title={title}
          description={description}
          onBack={back}
        >
          {notice}
          <div className="mt-2">
            <PatientSignUpForm
              user={user}
              parts={parts}
              defaults={parts.personalData ? defaults : undefined}
              submitLabel={parts.personalData ? t('finish') : t('continue')}
              onDone={() => {
                if (parts.personalData) {
                  onFinished('patient', user);
                  return;
                }
                // The fresh account leaves this page by itself (`leaving`).
                toast(t('auth.registrationCompletedSuccessfully'));
                void queryClient.invalidateQueries({
                  queryKey: identityKeys.me(user.id),
                });
              }}
            />
          </div>
        </AuthCard>
      );
    }
  }
}

/** Apple's private email cannot be matched with a Google account (the app warns too). */
function PrivateEmailNotice({ onSwitch }: { onSwitch: () => void }) {
  const t = useTranslations('auth');
  return (
    <div className="mb-4 flex flex-col items-start gap-2 rounded-xl bg-info-light px-4 py-3 text-left text-body-sm text-blue-800">
      <p>{t('privateEmailHint')}</p>
      <Button variant="white" size="small" shape="soft" onClick={onSwitch}>
        {t('switchAccount')}
      </Button>
    </div>
  );
}
