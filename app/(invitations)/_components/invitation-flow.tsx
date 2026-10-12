'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

import Link from 'next/link';

import CheckCircle from '@material-symbols/svg-400/rounded/check_circle.svg?svgr';
import CloudOff from '@material-symbols/svg-400/rounded/cloud_off.svg?svgr';
import EventBusy from '@material-symbols/svg-400/rounded/event_busy.svg?svgr';
import Group from '@material-symbols/svg-400/rounded/group.svg?svgr';
import LinkOff from '@material-symbols/svg-400/rounded/link_off.svg?svgr';
import Login from '@material-symbols/svg-400/rounded/login.svg?svgr';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { track } from '@/app/lib/analytics/track';
import type { AuthProvider } from '@/app/lib/auth/last-provider';
import { invitationQueryOptions } from '@/app/lib/queries/invitations';
import { routes } from '@/app/lib/routes';
import {
  planInvitationView,
  toInvitation,
  type ClaimRelationship,
  type Invitation,
} from '@/app/lib/schemas/invitations';

import { AppointmentHeadline } from '@/app/ui/appointments/appointment-headline';
import { SignInButtons } from '@/app/ui/auth/sign-in-buttons';
import { Button } from '@/app/ui/button';
import { EmptyState } from '@/app/ui/empty-state';
import { StatusCard } from '@/app/ui/status-card';

import { useSession } from '@/app/hooks/use-session';

import { ClaimForm } from './claim-form';
import { InvitationDetails } from './invitation-details';
import { ClaimSkeleton, InvitationSkeleton } from './invitation-skeleton';

type InvitationFlowProps = {
  token: string;
  /** The answer to «¿Para quién es esta cita?» kept across the sign-up. */
  initialRelationship: ClaimRelationship | null;
};

/*
 * `/i/{token}` (M4), the app's invitation screen: the invitation decides
 * what is said (its status, read from the patient's own device), and the
 * session decides what can be done. Nobody needs to sign in to see it; to
 * claim it, one signs in right here, finishes the sign-up if the account
 * has not, and says for whom it is. What a forwarded link shows to a
 * stranger stays minimal (REDOC-315).
 */
export function InvitationFlow({
  token,
  initialRelationship,
}: InvitationFlowProps) {
  const t = useTranslations();
  const session = useSession();
  const query = useQuery(invitationQueryOptions(token));
  /** The claim just made here: its words say so («¡Listo! La cita ya es tuya»). */
  const [claimed, setClaimed] = useState<{ confirmed: boolean } | null>(null);
  const [provider, setProvider] = useState<AuthProvider | null>(null);
  const signInTracked = useRef(false);

  const { account } = session;
  useEffect(() => {
    if (account === null || provider === null || signInTracked.current) return;
    signInTracked.current = true;
    track('web_signin_completed', { provider, role: account.role });
  }, [account, provider]);

  if (query.isPending) return <InvitationSkeleton />;

  if (query.isError) {
    return (
      <Frame>
        <EmptyState
          tone="error"
          icon={CloudOff}
          title={t('appointments.invitation.loadError')}
          description={t('appointments.invitation.loadErrorDescription')}
          action={
            <Button
              shape="soft"
              loading={query.isFetching}
              onClick={() => {
                void query.refetch();
              }}
            >
              {t('refresh')}
            </Button>
          }
        />
      </Frame>
    );
  }

  if (query.data === null) {
    return (
      <Frame>
        <EmptyState
          icon={LinkOff}
          title={t('appointments.invitation.notFound')}
          description={t('appointments.invitation.notFoundDescription')}
        />
      </Frame>
    );
  }

  const invitation = toInvitation(query.data);
  const view = planInvitationView(invitation, session);
  const signIn = (
    <SignInButtons
      onSignedIn={(_user, chosen) => {
        setProvider(chosen);
      }}
    />
  );
  const switchAccount = () => {
    void session.signOut();
  };

  switch (view.kind) {
    case 'expired':
    case 'cancelled':
      return (
        <Frame>
          <EmptyState
            icon={EventBusy}
            title={t(`appointments.invitation.status.${view.kind}`)}
            description={t('appointments.invitation.expiredDescription')}
          />
        </Frame>
      );

    case 'claimed-by-other':
      return (
        <Frame>
          <EmptyState
            icon={Group}
            title={t('appointments.invitation.claimedByOther')}
            description={t('appointments.invitation.claimedByOtherDescription')}
            action={
              <Button variant="white" shape="soft" onClick={switchAccount}>
                {t('auth.switchAccount')}
              </Button>
            }
          />
        </Frame>
      );

    case 'claimed-signed-out':
      return (
        <Frame>
          <StatusCard
            icon={Group}
            title={t('appointments.invitation.claimedByOther')}
            description={t(
              'appointments.invitation.claimedSignedOutDescription',
            )}
          >
            {signIn}
          </StatusCard>
        </Frame>
      );

    case 'claimed-by-me':
      return (
        <Frame>
          <AppointmentHeadline appointment={invitation.appointment} />
          <StatusCard
            icon={CheckCircle}
            title={
              claimed
                ? t('appointments.invitation.justClaimed')
                : t('appointments.invitation.alreadyClaimed')
            }
            description={
              claimed?.confirmed
                ? t('appointments.invitation.justClaimedConfirmed')
                : t('appointments.invitation.claimedDescription')
            }
          >
            <Button asChild block shape="soft">
              <Link href={routes.appointment(invitation.appointment.id)}>
                {t('appointments.invitation.seeAppointment')}
              </Link>
            </Button>
          </StatusCard>
          <InvitationDetails invitation={invitation} showPrivate />
        </Frame>
      );

    case 'account-error':
      return (
        <Frame>
          <EmptyState
            tone="error"
            icon={CloudOff}
            title={t('auth.accountError.title')}
            description={t('auth.accountError.description')}
            action={
              <>
                <Button shape="soft" onClick={session.retryAccount}>
                  {t('retry')}
                </Button>
                <Button variant="white" shape="soft" onClick={switchAccount}>
                  {t('auth.switchAccount')}
                </Button>
              </>
            }
          />
        </Frame>
      );

    case 'waiting':
      return (
        <Frame>
          <AppointmentHeadline appointment={invitation.appointment} />
          <ClaimSkeleton />
        </Frame>
      );

    case 'sign-in':
      return (
        <Frame>
          <AppointmentHeadline appointment={invitation.appointment} />
          <StatusCard
            icon={Login}
            title={t('appointments.invitation.needsAccount')}
            description={t('appointments.invitation.needsAccountDescription')}
          >
            {signIn}
            {/* TODO(M10): link the legal pages once they exist. */}
            <p className="text-center text-body-sm text-text-secondary">
              {t('auth.byLoggingInAcceptsOur')}
              <span className="font-semibold">
                {t('auth.termsOfUseAndPrivacy')}
              </span>
            </p>
          </StatusCard>
          <InvitationDetails invitation={invitation} showPrivate={false} />
        </Frame>
      );

    case 'for-patients':
      return (
        <Frame>
          <AppointmentHeadline appointment={invitation.appointment} />
          <StatusCard
            icon={Group}
            title={t('appointments.invitation.forPatients')}
            description={t('appointments.invitation.forPatientsDescription')}
          />
          <InvitationDetails invitation={invitation} showPrivate={false} />
        </Frame>
      );

    case 'claim':
      return (
        <ClaimView
          token={token}
          invitation={invitation}
          mustSignUp={view.mustSignUp}
          initialRelationship={initialRelationship}
          onClaimed={setClaimed}
          onSwitchAccount={switchAccount}
        />
      );
  }
}

function ClaimView({
  token,
  invitation,
  mustSignUp,
  initialRelationship,
  onClaimed,
  onSwitchAccount,
}: {
  token: string;
  invitation: Invitation;
  mustSignUp: boolean;
  initialRelationship: ClaimRelationship | null;
  onClaimed: (outcome: { confirmed: boolean }) => void;
  onSwitchAccount: () => void;
}) {
  const { user, account } = useSession();
  if (user === null || account === null) return <InvitationSkeleton />;

  return (
    <Frame>
      <AppointmentHeadline appointment={invitation.appointment} />
      <ClaimForm
        token={token}
        invitation={invitation}
        user={user}
        account={account}
        mustSignUp={mustSignUp}
        initialRelationship={initialRelationship}
        onClaimed={onClaimed}
        onSwitchAccount={onSwitchAccount}
      />
      <InvitationDetails invitation={invitation} showPrivate />
    </Frame>
  );
}

/** The page's column: its heading, then the invitation's cards. */
function Frame({ children }: { children: ReactNode }) {
  const t = useTranslations('appointments.invitation');
  return (
    <div className="flex w-full flex-col gap-4">
      <h1 className="text-headline-sm text-text-primary">{t('title')}</h1>
      {children}
    </div>
  );
}
