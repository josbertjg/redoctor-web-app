import type { ReactNode } from 'react';

import { getTranslations } from 'next-intl/server';

import { RequireSession } from '@/app/ui/auth/require-session';
import { SessionButton } from '@/app/ui/auth/session-button';
import { MessagesScope } from '@/app/ui/messages-scope';

import { PageFrame } from './page-frame';
import { PanelNav } from './panel-nav';
import { SiteHeader } from './site-header';

type PanelFrameProps = {
  /** The section's skeleton, with its final dimensions, until the person is known. */
  fallback: ReactNode;
  /** `narrow` for a form (the payment), `content` for lists and charts. */
  width?: 'narrow' | 'content';
  children: ReactNode;
};

/*
 * The specialist's panel around each of its sections (M14): the bar with
 * the account, the sections' navigation, and the page under the guard —
 * the specialist facet, or an admin's account (AGENTS.md §1). Used by every
 * layout under `/panel`, whichever module the section belongs to, and by
 * the payment's at `/pay`, out of the app's paths (AGENTS.md §6).
 */
export async function PanelFrame({
  fallback,
  width = 'content',
  children,
}: PanelFrameProps) {
  const t = await getTranslations('common');

  return (
    <>
      <SiteHeader homeLabel={t('homeLabel')}>
        <SessionButton />
      </SiteHeader>
      <MessagesScope namespaces={['panel']}>
        <PanelNav />
      </MessagesScope>
      <PageFrame width={width}>
        <RequireSession facet="specialist" fallback={fallback}>
          {children}
        </RequireSession>
      </PageFrame>
    </>
  );
}
