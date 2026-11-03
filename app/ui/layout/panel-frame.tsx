import type { ReactNode } from 'react';

import Link from 'next/link';

import { getTranslations } from 'next-intl/server';

import { RequireSession } from '@/app/ui/auth/require-session';
import { Logo } from '@/app/ui/logo';
import { MessagesScope } from '@/app/ui/messages-scope';
import { FrameTransition } from '@/app/ui/motion/view-transitions';
import type { ProfileStateLabels } from '@/app/ui/specialists/profile-state-chip';

import { PanelBar } from './panel-bar';
import { PanelNav } from './panel-nav';
import { PanelSurface } from './panel-surface';

type PanelFrameProps = {
  /** The section's skeleton, with its final dimensions, until the person is known. */
  fallback: ReactNode;
  /**
   * Every page of the segment sits on the white surface (a module with no
   * new design: the subscription and the payment), `narrow` for a form.
   */
  surface?: 'narrow' | 'content';
  children: ReactNode;
};

/** The guard's own states (the wrong area, an account that failed) on a white sheet. */
const stateSurface =
  'w-full max-w-2xl rounded-xl bg-pure-white p-6 shadow-md lg:mt-14';

/*
 * The specialist's panel around each of its sections (M14), as the designer
 * drew it on 2026-10-30: the blue primary to the edges, from laptops up a
 * white sidebar with the wordmark and the sections, and at the column's
 * top right the profile's state, the bell and the account; on phones and
 * tablets the bar with the wordmark and the sections as tabs under it. The
 * page under the guard — the specialist facet, or an admin's account
 * (AGENTS.md §1). Used by every layout under `/panel`, whichever module
 * the section belongs to, and by the payment's at `/pay`, out of the app's
 * paths (AGENTS.md §6).
 */
export async function PanelFrame({
  fallback,
  surface,
  children,
}: PanelFrameProps) {
  const [t, status] = await Promise.all([
    getTranslations('common'),
    getTranslations('profile.status'),
  ]);
  const labels: ProfileStateLabels = {
    active: status('active'),
    underReview: status('waitingAdminReview'),
    pendingVerification: status('pendingVerification'),
    inactive: status('inactive'),
    actionNeeded: status('actionNeeded'),
  };
  const onSurface = (node: ReactNode) =>
    surface === undefined ? (
      node
    ) : (
      <PanelSurface width={surface}>{node}</PanelSurface>
    );

  return (
    <div className="flex flex-1 bg-primary">
      <aside className="sticky top-0 hidden h-dvh shrink-0 py-11 pl-8 lg:block print:hidden">
        <div className="flex h-full w-62.5 flex-col gap-9 rounded-xl bg-pure-white px-3 pt-5 pb-6 shadow-md vt-panel-sidebar">
          <Link
            href="/"
            aria-label={t('homeLabel')}
            className="inline-flex min-h-touch items-center self-start rounded-lg px-2.5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Logo preload tone="brand" />
          </Link>
          <MessagesScope namespaces={['panel']}>
            <PanelNav orientation="vertical" />
          </MessagesScope>
        </div>
      </aside>
      <div className="relative flex min-w-0 flex-1 flex-col">
        <PanelBar homeLabel={t('homeLabel')} labels={labels} />
        <MessagesScope namespaces={['panel']}>
          <PanelNav orientation="horizontal" className="px-gutter lg:hidden" />
        </MessagesScope>
        <FrameTransition>
          <main className="flex w-full max-w-panel flex-1 flex-col px-gutter pt-5 pb-16 lg:pt-15 lg:pr-10 lg:pl-11">
            <RequireSession
              facet="specialist"
              fallback={onSurface(fallback)}
              stateClassName={stateSurface}
            >
              {onSurface(children)}
            </RequireSession>
          </main>
        </FrameTransition>
      </div>
    </div>
  );
}
