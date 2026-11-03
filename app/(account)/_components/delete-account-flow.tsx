'use client';

import { useId, useState } from 'react';

import AdminPanelSettings from '@material-symbols/svg-400/rounded/admin_panel_settings.svg?svgr';
import Badge from '@material-symbols/svg-400/rounded/badge.svg?svgr';
import CheckCircle from '@material-symbols/svg-400/rounded/check_circle.svg?svgr';
import CreditCardOff from '@material-symbols/svg-400/rounded/credit_card_off.svg?svgr';
import DeleteForever from '@material-symbols/svg-400/rounded/delete_forever.svg?svgr';
import DomainDisabled from '@material-symbols/svg-400/rounded/domain_disabled.svg?svgr';
import EventBusy from '@material-symbols/svg-400/rounded/event_busy.svg?svgr';
import Groups from '@material-symbols/svg-400/rounded/groups.svg?svgr';
import History from '@material-symbols/svg-400/rounded/history.svg?svgr';
import NotificationsOff from '@material-symbols/svg-400/rounded/notifications_off.svg?svgr';
import PersonOff from '@material-symbols/svg-400/rounded/person_off.svg?svgr';
import ReceiptLong from '@material-symbols/svg-400/rounded/receipt_long.svg?svgr';
import Reviews from '@material-symbols/svg-400/rounded/reviews.svg?svgr';
import Savings from '@material-symbols/svg-400/rounded/savings.svg?svgr';
import Storefront from '@material-symbols/svg-400/rounded/storefront.svg?svgr';

import { isApiError } from '@/app/lib/api/errors';
import type { Account } from '@/app/lib/auth/account';
import type { SessionUser } from '@/app/lib/firebase/client';

import { SignInButtons } from '@/app/ui/auth/sign-in-buttons';
import { useSignInArrival } from '@/app/ui/auth/use-sign-in-arrival';
import { Button } from '@/app/ui/button';
import { FieldError } from '@/app/ui/field-error';
import { Icon, type IconComponent } from '@/app/ui/icons';
import { Skeleton } from '@/app/ui/skeleton';

import { useSession } from '@/app/hooks/use-session';

/**
 * What the page says, translated on the server: the app's `auth.deleteAccount`
 * words (kept in the catalog under `legal.deleteAccount.flow`, so they never
 * travel with every page as the `auth` namespace does).
 */
export type DeleteAccountWords = {
  title: string;
  signIn: string;
  admin: string;
  intro: string;
  deletedTitle: string;
  cancelledTitle: string;
  keptTitle: string;
  patient: {
    personal: string;
    relatives: string;
    writtenReviews: string;
    devices: string;
    appointments: string;
    appointmentRecord: string;
  };
  specialist: {
    personal: string;
    profile: string;
    offices: string;
    credentials: string;
    receivedReviews: string;
    devices: string;
    appointments: string;
    subscription: string;
    balance: string;
    appointmentRecord: string;
    payments: string;
  };
  emailFree: string;
  /** «…entres de nuevo con Google» / «…con Apple». */
  reauthNote: { google: string; apple: string };
  button: string;
  deleted: string;
  wrongAccount: string;
  appleRevokeFailed: string;
  failed: string;
  noProvider: string;
};

type Consequence = { icon: IconComponent; text: string };

/** The app's three lists, by the account's role (`delete_account_screen.dart`). */
function consequences(words: DeleteAccountWords, specialist: boolean) {
  const { patient, specialist: own } = words;
  return {
    deleted: specialist
      ? [
          { icon: PersonOff, text: own.personal },
          { icon: Storefront, text: own.profile },
          { icon: DomainDisabled, text: own.offices },
          { icon: Badge, text: own.credentials },
          { icon: Reviews, text: own.receivedReviews },
          { icon: NotificationsOff, text: own.devices },
        ]
      : [
          { icon: PersonOff, text: patient.personal },
          { icon: Groups, text: patient.relatives },
          { icon: Reviews, text: patient.writtenReviews },
          { icon: NotificationsOff, text: patient.devices },
        ],
    cancelled: specialist
      ? [
          { icon: EventBusy, text: own.appointments },
          { icon: CreditCardOff, text: own.subscription },
          { icon: Savings, text: own.balance },
        ]
      : [{ icon: EventBusy, text: patient.appointments }],
    kept: specialist
      ? [
          { icon: History, text: own.appointmentRecord },
          { icon: ReceiptLong, text: own.payments },
        ]
      : [{ icon: History, text: patient.appointmentRecord }],
  } satisfies Record<string, Consequence[]>;
}

/*
 * Deleting one's account from the web (REDOC-352; the owner's call of
 * 2026-11-02 for self-service): what happens to each thing, by role, in the
 * app's words; then signing in again with the same provider — the proof
 * it is the person's wish —, Apple's permission withdrawn when the account
 * is Apple's (if that fails, nothing is deleted, as in the app), the
 * account deleted at once (`DELETE /identity/me`) and the session closed,
 * this browser's push dropped with it. Stores ask for a page that works
 * without the app: a stranger signs in right here. An admin's account is
 * not deleted from here (ERR_2019): another super admin does it.
 */
export function DeleteAccountFlow({ words }: { words: DeleteAccountWords }) {
  // The page as it was until a sign-in made here is under the colour.
  const { session, onSignedIn } = useSignInArrival();
  const { status, user, account, accountStatus } = session;
  const { signOut } = useSession();
  const [deleted, setDeleted] = useState(false);
  const headingId = useId();

  const content = () => {
    if (deleted) {
      return (
        <div className="flex animate-fade-in flex-col gap-2" role="status">
          <p className="flex items-center gap-2 text-title-md text-text-primary">
            <Icon icon={CheckCircle} size={24} className="text-success" />
            {words.deleted}
          </p>
          <p className="text-body-md text-text-secondary">{words.emailFree}</p>
        </div>
      );
    }
    if (status === 'signed-out') {
      return (
        <div className="flex animate-fade-in flex-col gap-4">
          <p className="text-body-md text-text-secondary">{words.signIn}</p>
          <SignInButtons onSignedIn={onSignedIn} />
        </div>
      );
    }
    if (
      status === 'resolving' ||
      user === null ||
      account === null ||
      accountStatus !== 'ready'
    ) {
      return (
        <div aria-busy="true" className="flex flex-col gap-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-touch w-48" />
        </div>
      );
    }
    if (account.role === 'admin') {
      return (
        <p className="flex animate-fade-in items-start gap-3 text-body-md text-text-primary">
          <Icon
            icon={AdminPanelSettings}
            size={24}
            className="shrink-0 text-primary"
          />
          {words.admin}
        </p>
      );
    }
    return (
      <Deletion
        words={words}
        user={user}
        account={account}
        onDeleted={() => {
          setDeleted(true);
          // The session of an account that no longer exists closes here,
          // this browser's push and the person's traces with it.
          void signOut('user');
        }}
      />
    );
  };

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-2xl bg-pure-white p-5 shadow-md sm:p-6"
    >
      <h2 id={headingId} className="mb-4 text-title-lg text-text-primary">
        {words.title}
      </h2>
      {content()}
    </section>
  );
}

function Deletion({
  words,
  user,
  account,
  onDeleted,
}: {
  words: DeleteAccountWords;
  user: SessionUser;
  account: Account;
  onDeleted: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const failureId = useId();
  const lists = consequences(words, account.specialist.exists);
  const provider = user.provider;

  const run = async () => {
    if (busy || provider === null) return;
    setBusy(true);
    setFailure(null);
    try {
      const { reauthenticate, revokeAppleAccess } =
        await import('@/app/lib/firebase/client');
      const confirmed = await reauthenticate(provider);
      if (confirmed.status === 'cancelled') return;
      if (confirmed.status === 'wrong-account') {
        setFailure(words.wrongAccount);
        return;
      }
      if (confirmed.status === 'failed') {
        setFailure(words.failed);
        return;
      }
      if (provider === 'apple') {
        // Apple's permission first: without withdrawing it, nothing is deleted.
        try {
          if (confirmed.appleAccessToken === null) throw new Error('No token');
          await revokeAppleAccess(confirmed.appleAccessToken);
        } catch {
          setFailure(words.appleRevokeFailed);
          return;
        }
      }
      const { deleteAccount } = await import('@/app/lib/queries/identity');
      await deleteAccount(user);
      onDeleted();
    } catch (error) {
      setFailure(
        isApiError(error) && error.code === 'ERR_2019'
          ? words.admin
          : words.failed,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex animate-fade-in flex-col gap-5">
      <p className="text-body-md text-text-primary">{words.intro}</p>
      <List title={words.deletedTitle} items={lists.deleted} />
      <List title={words.cancelledTitle} items={lists.cancelled} />
      <List title={words.keptTitle} items={lists.kept} />
      <p className="text-body-md text-text-secondary">{words.emailFree}</p>
      {provider === null ? (
        <p className="text-body-md text-text-primary">{words.noProvider}</p>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-body-sm text-text-secondary">
            {words.reauthNote[provider]}
          </p>
          <Button
            variant="error"
            shape="soft"
            className="self-start"
            loading={busy}
            aria-describedby={failure === null ? undefined : failureId}
            onClick={() => {
              void run();
            }}
          >
            <Icon icon={DeleteForever} size={20} />
            {words.button}
          </Button>
          <FieldError id={failureId} message={failure ?? undefined} />
        </div>
      )}
    </div>
  );
}

function List({ title, items }: { title: string; items: Consequence[] }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-title-sm text-text-primary">{title}</h3>
      <ul className="flex flex-col gap-2">
        {items.map(({ icon, text }) => (
          <li
            key={text}
            className="flex items-start gap-3 text-body-md text-text-secondary"
          >
            <Icon icon={icon} size={20} className="mt-0.5 shrink-0" />
            {text}
          </li>
        ))}
      </ul>
    </div>
  );
}
