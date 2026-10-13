'use client';

import CloudOff from '@material-symbols/svg-400/rounded/cloud_off.svg?svgr';
import { useTranslations } from 'next-intl';

import { Button } from '@/app/ui/button';
import { EmptyState } from '@/app/ui/empty-state';

import { useSession } from '@/app/hooks/use-session';

type AccountErrorStateProps = {
  /** 1 when it is the page's only heading. */
  headingLevel?: 1 | 2;
  /** Offer «Entrar con otra cuenta» beside the retry. */
  canSwitchAccount?: boolean;
  className?: string;
};

/*
 * Firebase has the person but the API could not say who they are (no
 * network, the API down): a retry that shows it is busy, and, where it
 * helps, the way to another account. Wherever a page waits for the account.
 */
export function AccountErrorState({
  headingLevel = 2,
  canSwitchAccount = false,
  className,
}: AccountErrorStateProps) {
  const t = useTranslations();
  const session = useSession();

  return (
    <EmptyState
      tone="error"
      icon={CloudOff}
      headingLevel={headingLevel}
      title={t('auth.accountError.title')}
      description={t('auth.accountError.description')}
      action={
        <>
          <Button
            shape="soft"
            loading={session.accountRetrying}
            onClick={session.retryAccount}
          >
            {t('retry')}
          </Button>
          {canSwitchAccount ? (
            <Button
              variant="white"
              shape="soft"
              onClick={() => {
                void session.signOut();
              }}
            >
              {t('auth.switchAccount')}
            </Button>
          ) : null}
        </>
      }
      {...(className === undefined ? {} : { className })}
    />
  );
}
