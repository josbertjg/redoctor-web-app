'use client';

import Link from 'next/link';

import { useTranslations } from 'next-intl';
import { DropdownMenu } from 'radix-ui';

import { routes } from '@/app/lib/routes';
import { cn } from '@/app/lib/utils';

import { Avatar } from '@/app/ui/avatar';

import { accountItemClass } from './account-item';

type AccountMenuProps = {
  name: string;
  photo: string | null;
  /** The account has a patient's side: «Mis citas». */
  patientArea: boolean;
  /** The account may enter the specialist's panel. */
  specialistArea: boolean;
  /** The account has a professional profile of its own: «Mi perfil». */
  ownProfile: boolean;
  onSignOut: () => void;
  className?: string | undefined;
};

/*
 * The account's menu in a bar: the avatar, and under it the person's name,
 * their areas and «Cerrar sesión». Its code (Radix's dropdown) loads only
 * for a signed-in person (session-button.tsx): a visitor's page carries
 * none of it.
 */
export default function AccountMenu({
  name,
  photo,
  patientArea,
  specialistArea,
  ownProfile,
  onSignOut,
  className,
}: AccountMenuProps) {
  const t = useTranslations('auth');

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={t('menu.label')}
          className={cn(
            'inline-flex min-h-touch min-w-touch items-center justify-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
            className,
          )}
        >
          <Avatar name={name} src={photo} size="md" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-30 min-w-56 origin-top-right rounded-2xl bg-pure-white p-2 shadow-lg data-[state=closed]:animate-fade-out data-[state=open]:animate-scale-in"
        >
          <DropdownMenu.Label className="px-3 py-2 text-label-md text-text-secondary">
            {name}
          </DropdownMenu.Label>
          {patientArea ? (
            <DropdownMenu.Item asChild>
              <Link href={routes.appointments()} className={accountItemClass}>
                {t('menu.appointments')}
              </Link>
            </DropdownMenu.Item>
          ) : null}
          {specialistArea ? (
            <DropdownMenu.Item asChild>
              <Link href={routes.specialistHome()} className={accountItemClass}>
                {t('menu.specialistHome')}
              </Link>
            </DropdownMenu.Item>
          ) : null}
          {ownProfile ? (
            <DropdownMenu.Item asChild>
              <Link
                href={routes.specialistProfile()}
                className={accountItemClass}
              >
                {t('menu.profile')}
              </Link>
            </DropdownMenu.Item>
          ) : null}
          <DropdownMenu.Separator className="my-1 h-px bg-divider" />
          {/* The menu stays open: the blue wipe grows from this item and
              covers it, and the menu goes with the session, under the
              colour — closing, it would shrink where the colour starts. */}
          <DropdownMenu.Item
            onSelect={(event) => {
              event.preventDefault();
              onSignOut();
            }}
            className={accountItemClass}
          >
            {t('signOut')}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
