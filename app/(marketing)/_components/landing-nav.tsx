'use client';

import { useState } from 'react';

import Close from '@material-symbols/svg-400/rounded/close.svg?svgr';
import Menu from '@material-symbols/svg-400/rounded/menu.svg?svgr';
import { Collapsible } from 'radix-ui';

import { SessionButton } from '@/app/ui/auth/session-button';
import { Button } from '@/app/ui/button';
import { Icon } from '@/app/ui/icons';

type LandingNavProps = {
  links: { href: string; label: string }[];
  /** Already translated on the server (i18n: `landing.nav.*`). */
  labels: { open: string; close: string };
};

/*
 * The menu on phones and tablets: the links and the session («Entrar», or
 * the account's options) unfold under the bar and fold back on a choice or
 * on Escape. Desktop shows the links inline (landing-header.tsx).
 */
export function LandingNav({ links, labels }: LandingNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible.Root
      open={open}
      onOpenChange={setOpen}
      className="lg:hidden"
      onKeyDown={(event) => {
        if (event.key === 'Escape') setOpen(false);
      }}
    >
      <Collapsible.Trigger asChild>
        <Button
          variant="white"
          size="small"
          shape="soft"
          aria-label={open ? labels.close : labels.open}
          className="px-2.5"
        >
          <Icon icon={open ? Close : Menu} size={24} />
        </Button>
      </Collapsible.Trigger>
      <Collapsible.Content className="absolute inset-x-0 top-full z-20 mt-2 origin-top rounded-2xl bg-pure-white p-3 shadow-lg data-[state=closed]:animate-fade-out data-[state=open]:animate-scale-in">
        <ul className="flex flex-col gap-1">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                onClick={() => {
                  setOpen(false);
                }}
                className="flex min-h-touch items-center rounded-lg px-3 text-subtitle-s font-medium text-pure-black transition-colors duration-fast ease-house outline-none hover:bg-surface-variant focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {link.label}
              </a>
            </li>
          ))}
          <li className="mt-2 sm:hidden">
            <SessionButton layout="list" />
          </li>
        </ul>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
