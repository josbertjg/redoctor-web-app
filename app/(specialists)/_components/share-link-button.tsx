'use client';

import Share from '@material-symbols/svg-400/rounded/share.svg?svgr';
import { useTranslations } from 'next-intl';

import { copyText } from '@/app/lib/clipboard';

import { Button } from '@/app/ui/button';
import { Icon } from '@/app/ui/icons';
import { toast } from '@/app/ui/toast';

type ShareLinkButtonProps = {
  /** The bare link: no text, no channel tag (AGENTS.md §6). */
  url: string;
  label: string;
  /** Said once the link is on the clipboard. */
  copied: string;
  size?: 'small' | 'large';
  className?: string;
};

/*
 * A profile's link, shared as the app shares it: the phone's share sheet
 * where the browser has one, and the clipboard otherwise (or when the sheet
 * itself fails). «Mi perfil»'s «Compartir perfil» and the public profile's
 * «Compartir».
 */
export function ShareLinkButton({
  url,
  label,
  copied,
  size = 'large',
  className,
}: ShareLinkButtonProps) {
  const t = useTranslations();

  const share = async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ url });
        return;
      } catch (error) {
        // The person closed the sheet: nothing to say.
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
      }
    }
    if (await copyText(url)) toast.success(copied);
    else toast.error(t('profile.share.copyFailed'));
  };

  return (
    <Button
      variant="white"
      size={size}
      shape="soft"
      {...(className ? { className } : {})}
      onClick={() => {
        void share();
      }}
    >
      <Icon icon={Share} size={18} />
      {label}
    </Button>
  );
}
