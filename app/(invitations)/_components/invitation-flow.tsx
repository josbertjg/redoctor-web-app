'use client';

import { useState, type ReactNode } from 'react';

import Link from 'next/link';

import CheckCircle from '@material-symbols/svg-400/rounded/check_circle.svg?svgr';
import CloudOff from '@material-symbols/svg-400/rounded/cloud_off.svg?svgr';
import EventBusy from '@material-symbols/svg-400/rounded/event_busy.svg?svgr';
import Group from '@material-symbols/svg-400/rounded/group.svg?svgr';
import LinkOff from '@material-symbols/svg-400/rounded/link_off.svg?svgr';
import Login from '@material-symbols/svg-400/rounded/login.svg?svgr';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { invitationQueryOptions } from '@/app/lib/queries/invitations';
import { routes } from '@/app/lib/routes';
import {
  planInvitationView,
  toInvitation,
  type ClaimRelationship,
  type Invitation,
} from '@/app/lib/schemas/invitations';

import { AppointmentHeadline } from '@/app/ui/appointments/appointment-headline';
import { AccountErrorState } from '@/app/ui/auth/account-error-state';
import { SignInButtons } from '@/app/ui/auth/sign-in-buttons';
import { SignInLegalNote } from '@/app/ui/auth/sign-in-legal-note';
import { useSignInArrival } from '@/app/ui/auth/use-sign-in-arrival';
import { Button } from '@/app/ui/button';
import { EmptyState } from '@/app/ui/empty-state';
import { useSkeletonHold } from '@/app/ui/motion/skeleton-hold';
import { StatusCard } from '@/app/ui/status-card';

import { useFocusHeading } from '@/app/hooks/use-focus-heading';
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
 *
 * The page's column and its heading stay in place across every state —
 * loading included —, so nothing jumps and what is already shown does not
 * appear again; after a claim the focus goes to its news.
 */
export function InvitationFlow({
  token,
  initialRelationship,
}: InvitationFlowProps) {
  const t = useTranslations();
  // The page as it was until a sign-in made here is under the colour.
  const { session, onSignedIn } = useSignInArrival();
  const query = useQuery(invitationQueryOptions(token));
  // The skeleton crossfades into the invitation (AGENTS.md §8, rule 13).
  const holding = useSkeletonHold(query.isPending);
  /** The claim just made here: its words say so («¡Listo! La cita ya es tuya»). */
  const [claimed, setClaimed] = useState<{ confirmed: boolean } | null>(null);

  const invitation =
    query.data === undefined || query.data === null
      ? null
      : toInvitation(query.data);
  const view =
    invitation === null ? null : planInvitationView(invitation, session);
  // After a claim made here, the focus goes to its news; loading never moves it.
  const frame = useFocusHeading(claimed);

  if (query.isPending || holding) {
    return (
      <Frame ref={frame}>
        <InvitationSkeleton />
      </Frame>
    );
  }

  // Only when there is nothing to show: a failed re-read after a claim keeps
  // the invitation on screen (the connection notice already said why).
  if (query.isLoadingError) {
    return (
      <Frame ref={frame}>
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
              {t('retry')}
            </Button>
          }
        />
      </Frame>
    );
  }

  if (invitation === null || view === null) {
    return (
      <Frame ref={frame}>
        <EmptyState
          icon={LinkOff}
          title={t('appointments.invitation.notFound')}
          description={t('appointments.invitation.notFoundDescription')}
        />
      </Frame>
    );
  }

  const signIn = <SignInButtons onSignedIn={onSignedIn} />;
  const switchAccount = () => {
    void session.signOut();
  };
  // Who, when and where, to those it may concern: never for an invitation
  // that is over or someone else's (REDOC-315), nor while the session that
  // would tell whose it is still answers.
  const headline =
    view.kind === 'claimed-by-me' ||
    view.kind === 'sign-in' ||
    view.kind === 'for-patients' ||
    view.kind === 'claim' ||
    (view.kind === 'waiting' && invitation.status === 'pending') ? (
      <AppointmentHeadline appointment={invitation.appointment} />
    ) : null;

  return (
    <Frame ref={frame}>
      {headline}
      {viewBody()}
    </Frame>
  );

  function viewBody() {
    if (invitation === null || view === null) return null;
    switch (view.kind) {
      case 'expired':
      case 'cancelled':
        return (
          <EmptyState
            icon={EventBusy}
            title={t(`appointments.invitation.status.${view.kind}`)}
            description={t('appointments.invitation.expiredDescription')}
          />
        );

      case 'claimed-by-other':
        return (
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
        );

      case 'claimed-signed-out':
        return (
          <StatusCard
            icon={Group}
            title={t('appointments.invitation.claimedByOther')}
            description={t(
              'appointments.invitation.claimedSignedOutDescription',
            )}
          >
            {signIn}
          </StatusCard>
        );

      case 'claimed-by-me':
        return (
          <>
            <StatusCard
              icon={CheckCircle}
              viewHeading
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
          </>
        );

      case 'account-error':
        return <AccountErrorState canSwitchAccount />;

      case 'waiting':
        return <ClaimSkeleton />;

      case 'sign-in':
        return (
          <>
            <StatusCard
              icon={Login}
              title={t('appointments.invitation.needsAccount')}
              description={t('appointments.invitation.needsAccountDescription')}
            >
              {signIn}
              <SignInLegalNote />
            </StatusCard>
            <InvitationDetails invitation={invitation} showPrivate={false} />
          </>
        );

      case 'for-patients':
        return (
          <>
            <StatusCard
              icon={Group}
              title={t('appointments.invitation.forPatients')}
              description={t('appointments.invitation.forPatientsDescription')}
            />
            <InvitationDetails invitation={invitation} showPrivate={false} />
          </>
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
  if (user === null || account === null) return <ClaimSkeleton />;

  return (
    <>
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
    </>
  );
}

/** The page's column: its heading, then the invitation's cards. */
function Frame({
  children,
  ref,
}: {
  children: ReactNode;
  ref?: React.Ref<HTMLDivElement>;
}) {
  const t = useTranslations('appointments.invitation');
  return (
    <div ref={ref} className="flex w-full flex-col gap-4">
      <h1 className="text-headline-sm text-text-primary">{t('title')}</h1>
      {children}
    </div>
  );
}
