'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';

import type { Route } from 'next';

import { useRouter } from 'next/navigation';

import { useTranslations } from 'next-intl';

import { destinationAfterSignIn } from '@/app/lib/auth/destination';
import { planSignUp } from '@/app/lib/auth/sign-up';
import { routes } from '@/app/lib/routes';
import { isApplePrivateRelayEmail } from '@/app/lib/schemas/identity';

import { Button } from '@/app/ui/button';
import { toast } from '@/app/ui/toast';

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
 */
export function SignUpFlow({ redirect, joinApp, finishApp }: SignUpFlowProps) {
  const t = useTranslations();
  const router = useRouter();
  const session = useSession();
  const { account, user } = session;
  const [role, setRole] = useState<SignUpRole | null>(null);
  const [finished, setFinished] = useState(false);

  const plan = account === null ? null : planSignUp(account, redirect);
  const leaving = plan?.step === 'done' && !finished;

  useEffect(() => {
    if (!leaving || account === null) return;
    router.replace(destinationAfterSignIn(account, redirect) as Route);
  }, [leaving, account, redirect, router]);

  if (account === null || user === null || plan === null || leaving) {
    return <SignUpSkeleton />;
  }

  if (finished) {
    return (
      <SignUpDone
        claiming={redirect !== null}
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

  const title = !parts.register
    ? t('finishPatientSignup.title')
    : parts.personalData
      ? t('signUp.claimTitle')
      : t('signUp.title');
  const description = parts.personalData
    ? t('finishPatientSignup.toClaim')
    : t('auth.signupPatientDescription');

  return (
    <div className="flex w-full flex-col items-center">
      <PatientCard title={title} description={description} notice={notice}>
        <PatientSignUpForm
          user={user}
          parts={parts}
          submitLabel={parts.personalData ? t('finish') : t('continue')}
          onDone={() => {
            if (parts.personalData) {
              setFinished(true);
              return;
            }
            // The fresh account leaves this page by itself (`leaving`).
            toast(t('auth.registrationCompletedSuccessfully'));
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
