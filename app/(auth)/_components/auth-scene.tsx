import type { ReactNode } from 'react';

import Image from 'next/image';

import { getTranslations } from 'next-intl/server';

import { SessionControls } from '@/app/ui/auth/session-controls';
import { SiteHeader } from '@/app/ui/layout/site-header';

/*
 * The way in (M2, M3), as the designer drew it on 2026-10-30: the blue
 * primary to the edges, the white wordmark back to the landing and — for
 * someone already signed in, who may want to leave — the bell and the
 * account; never «Entrar», since signing in is the page. A room is drawn
 * around the card from laptops up (a person walking in through a door, a
 * plant, a lamp): decoration, hidden from assistive technology, behind the
 * card and never under a finger. Phones get the card alone on the blue.
 */
export async function AuthScene({ children }: { children: ReactNode }) {
  const t = await getTranslations('common');

  return (
    <div className="relative isolate flex flex-1 flex-col overflow-hidden bg-primary">
      {/* The frame's bar: the wordmark and the account at the edges. */}
      <SiteHeader
        homeLabel={t('homeLabel')}
        tone="inverse"
        className="relative z-10 max-w-none lg:px-9 lg:pt-6"
      >
        <SessionControls tone="inverse" hideSignIn />
      </SiteHeader>
      <Room />
      <div className="relative z-10 flex flex-1 flex-col">{children}</div>
    </div>
  );
}

/** The frame's room, at its sizes from 1280 px and a step smaller below. */
function Room() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 hidden lg:block"
    >
      <Image
        src="/illustrations/auth/door.svg"
        alt=""
        width={533}
        height={528}
        className="absolute -bottom-1.5 -left-20 w-100 max-w-none xl:-left-25 xl:w-133"
      />
      <Image
        src="/illustrations/auth/plant.svg"
        alt=""
        width={79}
        height={180}
        className="absolute right-30 bottom-0 w-15 xl:right-40 xl:w-20"
      />
      <Image
        src="/illustrations/auth/lamp.svg"
        alt=""
        width={88}
        height={352}
        className="absolute right-12 -bottom-1 w-16 xl:right-17 xl:w-22"
      />
    </div>
  );
}
