'use client';

import { useId } from 'react';

import ChevronRight from '@material-symbols/svg-400/rounded/chevron_right.svg?svgr';
import Person from '@material-symbols/svg-400/rounded/person.svg?svgr';
import Stethoscope from '@material-symbols/svg-400/rounded/stethoscope.svg?svgr';
import { useTranslations } from 'next-intl';

import { Icon, type IconComponent } from '@/app/ui/icons';

export type SignUpRole = 'patient' | 'specialist';

type RoleChoiceProps = {
  onChoose: (role: SignUpRole) => void;
  /** A word for whoever arrived with Apple's private email. */
  notice?: React.ReactNode;
};

/*
 * «¿Quién eres?» as the app asks it, for an account with no sign-up behind
 * it: a patient signs up here; a specialist is shown the way to the app.
 */
export function RoleChoice({ onChoose, notice }: RoleChoiceProps) {
  const t = useTranslations();
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
        {t('auth.whoAreYou')}
      </h1>
      <p className="mt-2 text-center text-body-md text-text-secondary">
        {t('auth.whichModeDoYouWantToUse')}
      </p>
      {notice}
      <ul className="mt-6 flex flex-col gap-3">
        <li>
          <RoleOption
            icon={Person}
            title={t('patient')}
            description={t('auth.iWantToFindSpecialists')}
            onSelect={() => {
              onChoose('patient');
            }}
          />
        </li>
        <li>
          <RoleOption
            icon={Stethoscope}
            title={t('specialist')}
            description={t('auth.iWantToConnectWithPatients')}
            onSelect={() => {
              onChoose('specialist');
            }}
          />
        </li>
      </ul>
    </section>
  );
}

function RoleOption({
  icon,
  title,
  description,
  onSelect,
}: {
  icon: IconComponent;
  title: string;
  description: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex min-h-20 w-full items-center gap-4 rounded-2xl bg-pure-white p-4 text-left shadow-md transition-[translate,box-shadow] duration-base ease-house outline-none hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-info-light text-primary transition-[scale] duration-base ease-house group-hover:scale-110">
        <Icon icon={icon} size={24} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-title-md text-text-primary">{title}</span>
        <span className="text-body-sm text-text-secondary">{description}</span>
      </span>
      <Icon
        icon={ChevronRight}
        size={24}
        className="shrink-0 text-grey-400 transition-[translate] duration-base ease-house group-hover:translate-x-0.5"
      />
    </button>
  );
}
