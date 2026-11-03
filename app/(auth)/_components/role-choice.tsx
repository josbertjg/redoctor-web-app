'use client';

import type { ReactNode } from 'react';

import Image from 'next/image';

import ChevronRight from '@material-symbols/svg-400/rounded/chevron_right.svg?svgr';
import Emoticon from '@material-symbols/svg-400/rounded/emoticon.svg?svgr';
import { useTranslations } from 'next-intl';

import type { SignUpRole } from '@/app/lib/auth/sign-up';

import { Icon } from '@/app/ui/icons';

import { AuthCard } from './auth-card';

type RoleChoiceProps = {
  onChoose: (role: SignUpRole) => void;
  /** A word for whoever arrived with Apple's private email. */
  notice?: ReactNode;
  /** The way to sign in instead, for someone not signed in yet. */
  footer?: ReactNode;
};

/*
 * «¿Quién eres?» as the app asks it, in the designer's card: the patient's
 * and the specialist's avatars (the landing's own), the name of each mode
 * and what it is for. The specialist's line stays the app's: the frame's
 * «historias clínicas» promises records Redoctor does not keep (M10).
 */
export function RoleChoice({ onChoose, notice, footer }: RoleChoiceProps) {
  const t = useTranslations();

  return (
    <AuthCard
      icon={Emoticon}
      title={t('auth.whoAreYou')}
      description={t('auth.whichModeDoYouWantToUse')}
      footer={footer}
    >
      {notice}
      <ul className="flex flex-col gap-4 sm:gap-6">
        <li>
          <RoleOption
            avatar="/illustrations/landing/avatar-patient.svg"
            title={t('patient')}
            description={t('auth.iWantToFindSpecialists')}
            onSelect={() => {
              onChoose('patient');
            }}
          />
        </li>
        <li>
          <RoleOption
            avatar="/illustrations/landing/avatar-specialist.svg"
            title={t('specialist')}
            description={t('auth.iWantToConnectWithPatients')}
            onSelect={() => {
              onChoose('specialist');
            }}
          />
        </li>
      </ul>
    </AuthCard>
  );
}

function RoleOption({
  avatar,
  title,
  description,
  onSelect,
}: {
  avatar: string;
  title: string;
  description: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex w-full items-center gap-4 rounded-xl bg-pure-white px-3 py-3.5 text-left shadow-md transition-[translate,box-shadow] duration-base ease-house outline-none hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-3 focus-visible:ring-ring/50 sm:gap-4.5"
    >
      <Image
        src={avatar}
        alt=""
        aria-hidden="true"
        width={68}
        height={68}
        className="size-14 shrink-0 rounded-full transition-[scale] duration-base ease-house group-hover:scale-105 sm:size-17"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-subtitle-m font-bold text-text-primary">
          {title}
        </span>
        <span className="text-body-md text-pretty text-grey-800">
          {description}
        </span>
      </span>
      <Icon
        icon={ChevronRight}
        size={24}
        className="shrink-0 text-grey-500 transition-[translate] duration-base ease-house group-hover:translate-x-0.5"
      />
    </button>
  );
}
