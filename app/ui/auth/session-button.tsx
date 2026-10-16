'use client';

import { lazy, Suspense, useEffect } from 'react';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

import { useTranslations } from 'next-intl';

import { canUseSpecialistArea } from '@/app/lib/auth/account';
import { returnPath, routes } from '@/app/lib/routes';
import { cn } from '@/app/lib/utils';

import { Button } from '@/app/ui/button';
import { Skeleton } from '@/app/ui/skeleton';

import { useSession } from '@/app/hooks/use-session';

import { accountItemClass } from './account-item';

type SessionButtonProps = {
  /** Where to come back after signing in; the page's own path by default. */
  redirect?: string;
  /**
   * `bar`: «Entrar», or the account's avatar with its menu, for a header.
   * `list`: the same as items of a vertical menu (the landing's phone menu).
   */
  layout?: 'bar' | 'list';
  className?: string;
};

/**
 * A page signs the person in and brings them back to itself (AGENTS.md §1:
 * a patient returns to the link they came from), its query too — a search's
 * place and filters, a booking's office and day — but for what must not
 * travel (`returnPath`). Not the landing — there the account decides where
 * to go (a specialist to `/panel`) — nor the sign-in and sign-up pages
 * themselves.
 */
function backHere(pathname: string | null, search: string): string | undefined {
  if (pathname === null || pathname === routes.home()) return undefined;
  if (pathname === routes.signIn() || pathname === routes.signUp()) {
    return undefined;
  }
  return returnPath(pathname, search);
}

// The menu's code (Radix's dropdown) comes for a signed-in person only,
// fetched ahead when the hint says one is likely.
const loadAccountMenu = () => import('./account-menu');
const AccountMenu = lazy(loadAccountMenu);

/*
 * The session's place in a header (AGENTS.md §9): «Entrar» for whoever is
 * signed out; a placeholder of the same size while Firebase answers for a
 * browser that carried the session hint; then the person's avatar with
 * their menu — the specialist's panel and profile when the account has
 * them, and «Cerrar sesión».
 */
export function SessionButton({
  redirect,
  layout = 'bar',
  className,
}: SessionButtonProps) {
  const t = useTranslations('auth');
  const pathname = usePathname();
  // Null outside the App Router (a component rendered on its own, a test),
  // whatever its type says.
  const searchParams = useSearchParams() as URLSearchParams | null;
  const { status, expected, user, account, signOut } = useSession();

  useEffect(() => {
    if (expected && layout === 'bar') void loadAccountMenu();
  }, [expected, layout]);

  if (status === 'signed-out' || (status === 'resolving' && !expected)) {
    return (
      <Button
        asChild
        size="small"
        shape="soft"
        block={layout === 'list'}
        className={className}
      >
        <Link
          href={routes.signIn(
            redirect ?? backHere(pathname, searchParams?.toString() ?? ''),
          )}
        >
          {t('signIn')}
        </Link>
      </Button>
    );
  }

  if (status === 'resolving' || user === null) {
    return (
      <Skeleton
        className={cn(
          layout === 'list' ? 'h-control w-full' : 'size-10 rounded-full',
          className,
        )}
      />
    );
  }

  const name = user.name ?? user.email ?? t('menu.label');
  const patientArea = account?.patient.exists ?? false;
  const specialistArea = account !== null && canUseSpecialistArea(account);
  // The professional profile is a specialist's own (an admin's account has none).
  const ownProfile = account?.specialist.exists ?? false;
  const onSignOut = () => {
    void signOut();
  };

  if (layout === 'list') {
    return (
      <div className={cn('flex flex-col gap-1', className)}>
        <p className="px-3 py-2 text-label-md text-text-secondary">{name}</p>
        {patientArea ? (
          <Link href={routes.appointments()} className={accountItemClass}>
            {t('menu.appointments')}
          </Link>
        ) : null}
        {specialistArea ? (
          <Link href={routes.specialistHome()} className={accountItemClass}>
            {t('menu.specialistHome')}
          </Link>
        ) : null}
        {ownProfile ? (
          <Link href={routes.specialistProfile()} className={accountItemClass}>
            {t('menu.profile')}
          </Link>
        ) : null}
        <button type="button" onClick={onSignOut} className={accountItemClass}>
          {t('signOut')}
        </button>
      </div>
    );
  }

  return (
    <Suspense
      fallback={<Skeleton className={cn('size-10 rounded-full', className)} />}
    >
      <AccountMenu
        name={name}
        photo={user.photo}
        patientArea={patientArea}
        specialistArea={specialistArea}
        ownProfile={ownProfile}
        onSignOut={onSignOut}
        className={className}
      />
    </Suspense>
  );
}
