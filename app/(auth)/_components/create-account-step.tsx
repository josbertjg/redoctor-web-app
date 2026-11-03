'use client';

import Image from 'next/image';
import Link from 'next/link';

import Person from '@material-symbols/svg-400/rounded/person.svg?svgr';
import Stethoscope from '@material-symbols/svg-400/rounded/stethoscope.svg?svgr';
import { useTranslations } from 'next-intl';

import type { AuthProvider } from '@/app/lib/auth/last-provider';
import type { SignUpRole } from '@/app/lib/auth/sign-up';
import type { SessionUser } from '@/app/lib/firebase/client';
import { routes } from '@/app/lib/routes';

import { SignInButtons } from '@/app/ui/auth/sign-in-buttons';

import { AuthCard, authLinkClass } from './auth-card';

/** Each role's illustration, at its own size (the frames' exports). */
const illustrations = {
  patient: {
    src: '/illustrations/auth/create-patient.svg',
    width: 245,
    height: 204,
  },
  specialist: {
    src: '/illustrations/auth/create-specialist.svg',
    width: 229,
    height: 209,
  },
} as const;

type CreateAccountStepProps = {
  role: SignUpRole;
  /** Where the person goes once signed up, for the way to sign in instead. */
  redirect: string | null;
  /** Back to «¿Quién eres?», when the person chose the role there. */
  onBack?: (() => void) | undefined;
  onSignedIn: (user: SessionUser, provider: AuthProvider) => void;
};

/*
 * «Crea tu cuenta como paciente | especialista» (the designer's frames):
 * the account is the same Google or Apple account as the app's (AGENTS.md
 * §1 — the frame shows Google alone; Apple stays), made right here, under
 * the blue wipe; the form of the role comes next, on the same page.
 */
export function CreateAccountStep({
  role,
  redirect,
  onBack,
  onSignedIn,
}: CreateAccountStepProps) {
  const t = useTranslations();
  const illustration = illustrations[role];

  return (
    <AuthCard
      icon={role === 'patient' ? Person : Stethoscope}
      title={t(`signUp.createTitle.${role}`)}
      description={t(`signUp.createDescription.${role}`)}
      onBack={onBack}
      footer={
        <p>
          {t('auth.alreadyHaveAccount')}{' '}
          <Link
            href={routes.signIn(redirect ?? undefined)}
            className={authLinkClass}
          >
            {t('auth.signInLink')}
          </Link>
        </p>
      }
    >
      <div className="flex flex-col items-center gap-6">
        <Image
          src={illustration.src}
          alt=""
          aria-hidden="true"
          width={illustration.width}
          height={illustration.height}
          className="h-36 w-auto sm:h-48"
        />
        <h2 className="max-w-72 text-center text-subtitle-m font-bold text-balance text-text-primary">
          {t('auth.signupQuickAndSecure1')} {t('auth.signupQuickAndSecure2')}
        </h2>
        <SignInButtons onSignedIn={onSignedIn} className="w-full" />
      </div>
    </AuthCard>
  );
}
