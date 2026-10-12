'use client';

import { useEffect, useRef, useState } from 'react';

import CloudOff from '@material-symbols/svg-400/rounded/cloud_off.svg?svgr';
import EventBusy from '@material-symbols/svg-400/rounded/event_busy.svg?svgr';
import Login from '@material-symbols/svg-400/rounded/login.svg?svgr';
import NoAccounts from '@material-symbols/svg-400/rounded/no_accounts.svg?svgr';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { track } from '@/app/lib/analytics/track';
import type { AuthProvider } from '@/app/lib/auth/last-provider';
import type { SessionUser } from '@/app/lib/firebase/client';
import { appointmentQueryOptions } from '@/app/lib/queries/appointments';
import { toAppointmentSummary } from '@/app/lib/schemas/appointments';
import { canUseSpecialistArea, type Account } from '@/app/lib/schemas/identity';

import { SignInButtons } from '@/app/ui/auth/sign-in-buttons';
import { Button } from '@/app/ui/button';
import { EmptyState } from '@/app/ui/empty-state';
import { StatusCard } from '@/app/ui/status-card';

import { useSession } from '@/app/hooks/use-session';

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
  const [provider, setProvider] = useState<AuthProvider | null>(null);
  const signInTracked = useRef(false);
  const { account, user } = session;

  useEffect(() => {
    if (account === null || provider === null || signInTracked.current) return;
    signInTracked.current = true;
    track('web_signin_completed', { provider, role: account.role });
  }, [account, provider]);

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
          <SignInButtons
            onSignedIn={(_user, chosen) => {
              setProvider(chosen);
            }}
          />
          {/* TODO(M10): link the legal pages once they exist. */}
          <p className="text-center text-body-sm text-text-secondary">
            {t('auth.byLoggingInAcceptsOur')}
            <span className="font-semibold">
              {t('auth.termsOfUseAndPrivacy')}
            </span>
          </p>
        </StatusCard>
      </AppointmentFrame>
    );
  }

  if (session.accountStatus === 'error') {
    return (
      <AppointmentFrame>
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

  if (query.isError) {
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
              {t('refresh')}
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
