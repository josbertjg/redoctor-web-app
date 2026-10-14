'use client';

import { useId } from 'react';

import CheckCircle from '@material-symbols/svg-400/rounded/check_circle.svg?svgr';
import { useTranslations } from 'next-intl';

import type { SignUpPurpose } from '@/app/lib/auth/sign-up';

import { Button } from '@/app/ui/button';
import { Icon } from '@/app/ui/icons';

type SignUpDoneProps = {
  /** The flow the person came from: the button takes them back to it. */
  purpose: SignUpPurpose | null;
  onContinue: () => void;
};

/** What comes next, and the button that leads there, for each flow. */
const nextWords = {
  claim: { steps: 'claimNextSteps', action: 'claimAppointment' },
  book: { steps: 'bookNextSteps', action: 'bookAppointment' },
  none: { steps: 'nextSteps', action: 'findSpecialists' },
} as const;

/** «¡Todo listo!», as the app says it once the patient's data is complete. */
export function SignUpDone({ purpose, onContinue }: SignUpDoneProps) {
  const t = useTranslations('finishPatientSignup');
  const headingId = useId();
  const words = nextWords[purpose ?? 'none'];

  return (
    <section
      aria-labelledby={headingId}
      className="w-full max-w-md animate-fade-up rounded-2xl bg-pure-white p-6 text-center shadow-md sm:p-8"
    >
      <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-green-50 text-green-700">
        <Icon icon={CheckCircle} className="size-8" />
      </span>
      <h1 id={headingId} className="mt-4 text-headline-sm text-text-primary">
        {t('everythingReady')}
      </h1>
      <p className="mt-2 text-title-md text-text-primary">
        {t('successfulRegistration')}
      </p>
      <p className="mt-1 text-body-md text-text-secondary">{t(words.steps)}</p>
      <Button block shape="soft" className="mt-6" onClick={onContinue}>
        {t(words.action)}
      </Button>
    </section>
  );
}
