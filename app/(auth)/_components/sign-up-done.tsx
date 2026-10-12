'use client';

import { useId } from 'react';

import CheckCircle from '@material-symbols/svg-400/rounded/check_circle.svg?svgr';
import { useTranslations } from 'next-intl';

import { Button } from '@/app/ui/button';
import { Icon } from '@/app/ui/icons';

type SignUpDoneProps = {
  /** The person came to claim an appointment: the button takes them back to it. */
  claiming: boolean;
  onContinue: () => void;
};

/** «¡Todo listo!», as the app says it once the patient's data is complete. */
export function SignUpDone({ claiming, onContinue }: SignUpDoneProps) {
  const t = useTranslations('finishPatientSignup');
  const headingId = useId();

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
      <p className="mt-1 text-body-md text-text-secondary">
        {t(claiming ? 'claimNextSteps' : 'nextSteps')}
      </p>
      <Button block shape="soft" className="mt-6" onClick={onContinue}>
        {t(claiming ? 'claimAppointment' : 'findSpecialists')}
      </Button>
    </section>
  );
}
