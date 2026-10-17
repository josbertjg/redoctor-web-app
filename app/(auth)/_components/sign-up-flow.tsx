'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';

import type { Route } from 'next';

import { useRouter } from 'next/navigation';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { isApplePrivateRelayEmail } from '@/app/lib/auth/account';
import { destinationAfterSignIn } from '@/app/lib/auth/destination';
import {
  invitationOf,
  planSignUp,
  signUpPurposeOf,
} from '@/app/lib/auth/sign-up';
import { identityKeys } from '@/app/lib/queries/identity-keys';
import { invitationQueryOptions } from '@/app/lib/queries/invitations';
import { routes } from '@/app/lib/routes';
import { personalDataFrom, toInvitation } from '@/app/lib/schemas/invitations';

import { RequireSession } from '@/app/ui/auth/require-session';
import { Button } from '@/app/ui/button';
import { moveStep } from '@/app/ui/motion/directions';
import { wipeScreen } from '@/app/ui/motion/screen-wipe';
import { StepTransition } from '@/app/ui/motion/view-transitions';
import { toast } from '@/app/ui/toast';

import { useFocusHeading } from '@/app/hooks/use-focus-heading';
import { useSession } from '@/app/hooks/use-session';

import { PatientSignUpForm } from './patient-sign-up-form';
import { RoleChoice, type SignUpRole } from './role-choice';
import { SignUpDone } from './sign-up-done';
import { SignUpSkeleton } from './sign-up-skeleton';

type SignUpFlowProps = {
  /** A same-origin path to return to, already checked by the page. */
  redirect: string | null;
  /** The way to the app for a specialist with no account yet (rendered on the server). */
  joinApp: ReactNode;
  /** The way to the app for a specialist whose sign-up is still open. */
  finishApp: ReactNode;
};

/*
 * `/sign-up` (M3): what the API says of the account decides what is asked
 * (app/lib/auth/sign-up.ts). A brand-new account says who it is; a patient
 * fills the form; a specialist is shown the way to the app, where their
 * sign-up happens. Done, the person goes back to where they were going.
 * Claiming an invitation that is theirs (M4: `/i/{token}?for=self`), the
 * form starts from the invitation's data, as the app's prefill does.
 *
 * The session guard lives here, not in the page, so every test of the flow
 * goes through it: an account with no sign-up behind it is who this page is
 * for, and the guard sends such an account here from everywhere else.
 */
export function SignUpFlow(props: SignUpFlowProps) {
  return (
    <RequireSession
      fallback={<SignUpSkeleton />}
      returnTo={routes.signUp(props.redirect ?? undefined)}
      allowUnregistered
    >
      <SignUpSteps {...props} />
    </RequireSession>
  );
}

function SignUpSteps(props: SignUpFlowProps) {
  const [role, setRole] = useState<SignUpRole | null>(null);
  const [finished, setFinished] = useState(false);
  // Each step the person takes (a role, back, done) brings the focus to its
  // title; loading never moves it.
  const step = useFocusHeading(`${String(role)}:${String(finished)}`);

  return (
    // `contents`: a handle for the focus, no box of its own.
    <div ref={step} className="contents">
      {/* A role chosen goes forward, back to the roles goes back; the end
          is a big moment, under the green wipe (AGENTS.md §8, rule 13). */}
      <StepTransition step={`${String(role)}:${String(finished)}`}>
        <SignUpStep
          {...props}
          role={role}
          onRole={(next) => {
            moveStep(next === null ? 'back' : 'forward', () => {
              setRole(next);
            });
          }}
          finished={finished}
          onFinished={(readAccount) => {
            void wipeScreen({
              tone: 'success',
              // «¡Todo listo!» first, then the account read again: a fresh
              // account on a page that has not finished moves it away.
              whileCovered: async () => {
                setFinished(true);
                await readAccount();
              },
            });
          }}
        />
      </StepTransition>
    </div>
  );
}

function SignUpStep({
  redirect,
  joinApp,
  finishApp,
  role,
  onRole: setRole,
  finished,
  onFinished,
}: SignUpFlowProps & {
  role: SignUpRole | null;
  onRole: (role: SignUpRole | null) => void;
  finished: boolean;
  /** The sign-up is done; `readAccount` reads the account again, under the colour. */
  onFinished: (readAccount: () => Promise<void>) => void;
}) {
  const t = useTranslations();
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useSession();
  const { account, user } = session;

  const purpose = signUpPurposeOf(redirect);
  const claim = invitationOf(redirect);
  const invitation = useQuery({
    ...invitationQueryOptions(claim?.token ?? ''),
    enabled: claim?.forSelf === true,
  });
  const waitingForInvitation = claim?.forSelf === true && invitation.isPending;

  const plan = account === null ? null : planSignUp(account, redirect);
  const leaving = plan?.step === 'done' && !finished;

  useEffect(() => {
    if (!leaving || account === null) return;
    router.replace(destinationAfterSignIn(account, redirect) as Route);
  }, [leaving, account, redirect, router]);

  if (
    account === null ||
    user === null ||
    plan === null ||
    leaving ||
    waitingForInvitation
  ) {
    return <SignUpSkeleton />;
  }

  if (finished) {
    return (
      <SignUpDone
        purpose={purpose}
        onContinue={() => {
          router.replace((redirect ?? routes.home()) as Route);
        }}
      />
    );
  }

  if (plan.step === 'specialist-in-app') return finishApp;

  const notice = isApplePrivateRelayEmail(user.email) ? (
    <PrivateEmailNotice
      onSwitch={() => {
        void session.signOut();
      }}
    />
  ) : null;

  if (plan.step === 'choose-role' && role === null) {
    return <RoleChoice onChoose={setRole} notice={notice} />;
  }

  const back =
    plan.step === 'choose-role' ? (
      <Button
        variant="white"
        shape="soft"
        className="mt-4"
        onClick={() => {
          setRole(null);
        }}
      >
        {t('signUp.back')}
      </Button>
    ) : null;

  if (plan.step === 'choose-role' && role === 'specialist') {
    return (
      <div className="flex w-full flex-col items-center">
        {joinApp}
        {back}
      </div>
    );
  }

  const parts =
    plan.step === 'patient'
      ? { register: plan.register, personalData: plan.personalData }
      : { register: true, personalData: false };

  const booking = purpose === 'book';
  const title = !parts.register
    ? t('finishPatientSignup.title')
    : parts.personalData
      ? t(booking ? 'signUp.bookTitle' : 'signUp.claimTitle')
      : t('signUp.title');
  const defaults =
    parts.personalData && invitation.data
      ? personalDataFrom(toInvitation(invitation.data))
      : undefined;
  const prefilled = defaults !== undefined && Object.keys(defaults).length > 0;
  const description = !parts.personalData
    ? t('auth.signupPatientDescription')
    : booking
      ? t('finishPatientSignup.toBook')
      : t(
          prefilled
            ? 'finishPatientSignup.toClaimPrefilled'
            : 'finishPatientSignup.toClaim',
        );

  return (
    <div className="flex w-full flex-col items-center">
      <PatientCard title={title} description={description} notice={notice}>
        <PatientSignUpForm
          user={user}
          parts={parts}
          defaults={defaults}
          submitLabel={parts.personalData ? t('finish') : t('continue')}
          onDone={() => {
            // The account read again moves the page on: never before the
            // page knows where it goes.
            const readAccount = () =>
              queryClient.invalidateQueries({
                queryKey: identityKeys.me(user.id),
              });
            if (parts.personalData) {
              onFinished(readAccount);
              return;
            }
            // The fresh account leaves this page by itself (`leaving`).
            toast(t('auth.registrationCompletedSuccessfully'));
            void readAccount();
          }}
        />
      </PatientCard>
      {back}
    </div>
  );
}

function PatientCard({
  title,
  description,
  notice,
  children,
}: {
  title: string;
  description: string;
  notice: ReactNode;
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="w-full max-w-md animate-fade-up rounded-2xl bg-pure-white p-6 shadow-md sm:p-8"
    >
      <h1
        id={headingId}
        className="text-center text-headline-sm text-text-primary"
      >
        {title}
      </h1>
      <p className="mt-2 text-center text-body-md text-text-secondary">
        {description}
      </p>
      {notice}
      <div className="mt-6">{children}</div>
    </section>
  );
}

/** Apple's private email cannot be matched with a Google account (the app warns too). */
function PrivateEmailNotice({ onSwitch }: { onSwitch: () => void }) {
  const t = useTranslations('auth');
  return (
    <div className="mt-4 flex flex-col items-start gap-2 rounded-xl bg-info-light px-4 py-3 text-body-sm text-blue-800">
      <p>{t('privateEmailHint')}</p>
      <Button variant="white" size="small" shape="soft" onClick={onSwitch}>
        {t('switchAccount')}
      </Button>
    </div>
  );
}
