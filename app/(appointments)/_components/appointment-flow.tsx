'use client';

import CloudOff from '@material-symbols/svg-400/rounded/cloud_off.svg?svgr';
import EventBusy from '@material-symbols/svg-400/rounded/event_busy.svg?svgr';
import Login from '@material-symbols/svg-400/rounded/login.svg?svgr';
import NoAccounts from '@material-symbols/svg-400/rounded/no_accounts.svg?svgr';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { canUseSpecialistArea, type Account } from '@/app/lib/auth/account';
import type { SessionUser } from '@/app/lib/firebase/client';
import { appointmentQueryOptions } from '@/app/lib/queries/appointments';
import { toAppointmentSummary } from '@/app/lib/schemas/appointments';

import { AccountErrorState } from '@/app/ui/auth/account-error-state';
import { SignInButtons } from '@/app/ui/auth/sign-in-buttons';
import { SignInLegalNote } from '@/app/ui/auth/sign-in-legal-note';
import { Button } from '@/app/ui/button';
import { EmptyState } from '@/app/ui/empty-state';
import { StatusCard } from '@/app/ui/status-card';

import { useSession } from '@/app/hooks/use-session';
import { useSignInTracking } from '@/app/hooks/use-sign-in-tracking';

import { AppointmentSkeleton } from './appointment-skeleton';
import { AppointmentFrame, AppointmentView } from './appointment-view';

/*
 * `/a/{id}` (M5): an appointment belongs to an account, so the page asks
 * for the session right here (one tap, AGENTS.md §1), then reads the
 * appointment from the patient's device. Someone else's appointment, or a
 * link that leads nowhere, says so with the way out.
 */
export function AppointmentFlow({ appointmentId }: { appointmentId: string }) {
  const t = useTranslations();
  const session = useSession();
  const onSignedIn = useSignInTracking();
  const { account, user } = session;

  const switchAccount = () => {
    void session.signOut();
  };

  if (session.status === 'resolving') return <AppointmentSkeleton />;

  if (session.status === 'signed-out') {
    return (
      <AppointmentFrame>
        <StatusCard
          icon={Login}
          title={t('appointments.detail.signIn')}
          description={t('appointments.detail.signInDescription')}
        >
          <SignInButtons onSignedIn={onSignedIn} />
          <SignInLegalNote />
        </StatusCard>
      </AppointmentFrame>
    );
  }

  if (session.accountStatus === 'error') {
    return (
      <AppointmentFrame>
        <AccountErrorState canSwitchAccount />
      </AppointmentFrame>
    );
  }

  if (user === null || account === null) return <AppointmentSkeleton />;

  return (
    <SignedInAppointment
      appointmentId={appointmentId}
      user={user}
      account={account}
      onSwitchAccount={switchAccount}
    />
  );
}

function SignedInAppointment({
  appointmentId,
  user,
  account,
  onSwitchAccount,
}: {
  appointmentId: string;
  user: SessionUser;
  account: Account;
  onSwitchAccount: () => void;
}) {
  const t = useTranslations();
  const query = useQuery(appointmentQueryOptions(user, appointmentId));

  if (query.isPending) return <AppointmentSkeleton />;

  // Only when there is nothing to show: a failed re-read after a write keeps
  // the appointment on screen (the connection notice already said why).
  if (query.isLoadingError) {
    return (
      <AppointmentFrame>
        <EmptyState
          tone="error"
          icon={CloudOff}
          title={t('appointments.detail.loadError')}
          description={t('appointments.detail.loadErrorDescription')}
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
      </AppointmentFrame>
    );
  }

  const read = query.data;
  if (read.kind === 'not-found') {
    return (
      <AppointmentFrame>
        <EmptyState
          icon={EventBusy}
          title={t('appointments.detail.notFound')}
          description={t('appointments.detail.notFoundDescription')}
        />
      </AppointmentFrame>
    );
  }
  if (read.kind === 'not-yours') {
    return (
      <AppointmentFrame>
        <EmptyState
          icon={NoAccounts}
          title={t('appointments.detail.notYours')}
          description={t('appointments.detail.notYoursDescription', {
            email: user.email ?? user.name ?? '',
          })}
          action={
            <Button variant="white" shape="soft" onClick={onSwitchAccount}>
              {t('auth.switchAccount')}
            </Button>
          }
        />
      </AppointmentFrame>
    );
  }

  const appointment = toAppointmentSummary(read.appointment);
  return (
    <AppointmentView
      appointment={appointment}
      user={user}
      readOnly={
        appointment.patientId !== account.id && canUseSpecialistArea(account)
      }
    />
  );
}
