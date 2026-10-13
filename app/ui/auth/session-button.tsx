'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useTranslations } from 'next-intl';
import { DropdownMenu } from 'radix-ui';

import { canUseSpecialistArea } from '@/app/lib/auth/account';
import { routes } from '@/app/lib/routes';
import { cn } from '@/app/lib/utils';

import { Avatar } from '@/app/ui/avatar';
import { Button } from '@/app/ui/button';
import { Skeleton } from '@/app/ui/skeleton';

import { useSession } from '@/app/hooks/use-session';

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
 * a patient returns to the link they came from). Not the landing — there the
 * account decides where to go (a specialist to `/panel`) — nor the sign-in
 * and sign-up pages themselves.
 */
function returnPath(pathname: string | null): string | undefined {
  if (pathname === null || pathname === routes.home()) return undefined;
  if (pathname === routes.signIn() || pathname === routes.signUp()) {
    return undefined;
  }
  return pathname;
}

const itemClass =
  'flex min-h-touch w-full cursor-pointer items-center rounded-lg px-3 text-body-md text-text-primary transition-colors duration-fast ease-house outline-none select-none hover:bg-surface-variant focus-visible:ring-3 focus-visible:ring-ring/50 data-[highlighted]:bg-surface-variant';

/*
 * The session's place in a header (AGENTS.md §9): «Entrar» for whoever is
 * signed out; a placeholder of the same size while Firebase answers for a
 * browser that carried the session hint; then the person's avatar with
 * their menu — the specialist's page when the account has one, and
 * «Cerrar sesión».
 */
export function SessionButton({
  redirect,
  layout = 'bar',
  className,
}: SessionButtonProps) {
  const t = useTranslations('auth');
  const pathname = usePathname();
  const { status, expected, user, account, signOut } = useSession();

  if (status === 'signed-out' || (status === 'resolving' && !expected)) {
    return (
      <Button
        asChild
        size="small"
        shape="soft"
        block={layout === 'list'}
        className={className}
      >
        <Link href={routes.signIn(redirect ?? returnPath(pathname))}>
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
  const onSignOut = () => {
    void signOut();
  };

  if (layout === 'list') {
    return (
      <div className={cn('flex flex-col gap-1', className)}>
        <p className="px-3 py-2 text-label-md text-text-secondary">{name}</p>
        {patientArea ? (
          <Link href={routes.appointments()} className={itemClass}>
            {t('menu.appointments')}
          </Link>
        ) : null}
        {specialistArea ? (
          <Link href={routes.specialistHome()} className={itemClass}>
            {t('menu.specialistHome')}
          </Link>
        ) : null}
        <button type="button" onClick={onSignOut} className={itemClass}>
          {t('signOut')}
        </button>
      </div>
    );
  }

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
          <Avatar name={name} src={user.photo} size="md" />
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
              <Link href={routes.appointments()} className={itemClass}>
                {t('menu.appointments')}
              </Link>
            </DropdownMenu.Item>
          ) : null}
          {specialistArea ? (
            <DropdownMenu.Item asChild>
              <Link href={routes.specialistHome()} className={itemClass}>
                {t('menu.specialistHome')}
              </Link>
            </DropdownMenu.Item>
          ) : null}
          <DropdownMenu.Separator className="my-1 h-px bg-divider" />
          <DropdownMenu.Item onSelect={onSignOut} className={itemClass}>
            {t('signOut')}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
