'use client';

import { useId } from 'react';

import ContentCopy from '@material-symbols/svg-400/rounded/content_copy.svg?svgr';
import OpenInBrowser from '@material-symbols/svg-400/rounded/open_in_browser.svg?svgr';
import { useTranslations } from 'next-intl';

import type { InAppBrowser } from '@/app/lib/platform';
import { cn } from '@/app/lib/utils';

import { Button } from '@/app/ui/button';
import { Icon } from '@/app/ui/icons';
import { toast } from '@/app/ui/toast';

type InAppBrowserHelpProps = {
  app: InAppBrowser;
  className?: string | undefined;
};

/*
 * Instead of the sign-in buttons, inside Instagram's or Facebook's browser
 * (AGENTS.md §1): Google refuses to sign anyone in from there, so this says
 * how to open the same link in Chrome or Safari, and copies it for them.
 */
export function InAppBrowserHelp({ app, className }: InAppBrowserHelpProps) {
  const t = useTranslations('auth.inAppBrowser');
  const headingId = useId();

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast(t('copied'));
    } catch {
      // The clipboard can be refused inside a web view: the address bar is
      // still there to copy from.
    }
  };

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        'flex animate-fade-up flex-col items-center gap-4 text-center',
        className,
      )}
    >
      <span className="flex size-16 items-center justify-center rounded-full bg-info-light text-primary">
        <Icon icon={OpenInBrowser} className="size-8" />
      </span>
      <div className="flex flex-col gap-2">
        <h2 id={headingId} className="text-title-lg text-text-primary">
          {t('title')}
        </h2>
        <p className="text-body-md text-text-secondary">
          {t('description', { app })}
        </p>
        <p className="text-body-md text-text-secondary">{t('steps')}</p>
      </div>
      <Button
        variant="white"
        shape="soft"
        onClick={() => {
          void copyLink();
        }}
      >
        <Icon icon={ContentCopy} size={20} />
        {t('copyLink')}
      </Button>
    </section>
  );
}
