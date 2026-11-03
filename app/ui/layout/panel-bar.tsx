import Link from 'next/link';

import { SessionControls } from '@/app/ui/auth/session-controls';
import { Logo } from '@/app/ui/logo';
import {
  ProfileStateChip,
  type ProfileStateLabels,
} from '@/app/ui/specialists/profile-state-chip';

type PanelBarProps = {
  /** Accessible name of the wordmark's link (`common.homeLabel`). */
  homeLabel: string;
  labels: ProfileStateLabels;
};

/*
 * The panel's bar on the blue: on phones and tablets the white wordmark and
 * the controls; from laptops up the controls alone, at the column's top
 * right, level with the page's title (the wordmark lives in the sidebar).
 * The controls: the profile's state, the bell and the account.
 */
export function PanelBar({ homeLabel, labels }: PanelBarProps) {
  return (
    <header className="flex items-center justify-between gap-3 px-gutter py-3 vt-panel-bar lg:absolute lg:top-15 lg:right-10 lg:z-10 lg:p-0 print:hidden">
      <Link
        href="/"
        aria-label={homeLabel}
        className="-mx-2 inline-flex min-h-touch items-center rounded-lg px-2 outline-none focus-visible:ring-3 focus-visible:ring-white-50/70 lg:hidden"
      >
        <Logo preload tone="inverse" />
      </Link>
      <div className="flex items-center gap-2 sm:gap-3">
        <ProfileStateChip labels={labels} />
        <SessionControls tone="inverse" />
      </div>
    </header>
  );
}
