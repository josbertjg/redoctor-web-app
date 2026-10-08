'use client';

import { useActionState } from 'react';

import LinkOff from '@material-symbols/svg-400/rounded/link_off.svg?svgr';
import MarkEmailRead from '@material-symbols/svg-400/rounded/mark_email_read.svg?svgr';
import NotificationsOff from '@material-symbols/svg-400/rounded/notifications_off.svg?svgr';
import Unsubscribe from '@material-symbols/svg-400/rounded/unsubscribe.svg?svgr';

import {
  changeDailySummary,
  type DailySummaryState,
} from '@/app/lib/actions/daily-summary';

import { Button } from '@/app/ui/button';
import { EmptyState } from '@/app/ui/empty-state';

type ViewCopy = { title: string; description: string; action: string };

/** Already translated on the server (i18n: `dailySummary.*`). */
export type DailySummaryLabels = {
  ask: ViewCopy;
  unsubscribed: ViewCopy;
  subscribed: ViewCopy;
  invalidLink: { title: string; description: string };
  failed: string;
};

const initialState: DailySummaryState = { view: 'ask', failed: false };

const icons = {
  ask: Unsubscribe,
  unsubscribed: NotificationsOff,
  subscribed: MarkEmailRead,
};

/*
 * Nothing changes until the specialist says so: mail scanners open links on
 * their own, so a visit never unsubscribes anyone. Each answer replaces the
 * view with a fade (a new key); a failure keeps it and says what to do.
 */
export function DailySummaryOptOut({
  token,
  labels,
}: {
  token: string | undefined;
  labels: DailySummaryLabels;
}) {
  const [state, formAction, pending] = useActionState(
    changeDailySummary,
    initialState,
  );

  if (token === undefined || state.view === 'invalid-link') {
    return (
      <EmptyState
        key="invalid-link"
        headingLevel={1}
        tone="error"
        icon={LinkOff}
        title={labels.invalidLink.title}
        description={labels.invalidLink.description}
      />
    );
  }

  const { view } = state;
  const copy = labels[view];
  const isUnsubscribed = view === 'unsubscribed';

  return (
    <EmptyState
      key={view}
      headingLevel={1}
      icon={icons[view]}
      title={copy.title}
      description={copy.description}
      action={
        <form
          action={formAction}
          className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:items-center"
        >
          <input type="hidden" name="token" value={token} />
          <input
            type="hidden"
            name="intent"
            value={isUnsubscribed ? 'subscribe' : 'unsubscribe'}
          />
          <Button
            type="submit"
            block
            variant={isUnsubscribed ? 'white' : 'primary'}
            loading={pending}
            className="sm:w-auto"
          >
            {copy.action}
          </Button>
          {state.failed ? (
            <p
              role="alert"
              className="animate-fade-in text-body-sm text-error-700"
            >
              {labels.failed}
            </p>
          ) : null}
        </form>
      }
    />
  );
}
