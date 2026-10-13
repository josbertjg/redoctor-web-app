'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

import Check from '@material-symbols/svg-400/rounded/check.svg?svgr';
import ContentCopy from '@material-symbols/svg-400/rounded/content_copy.svg?svgr';
import { useTranslations } from 'next-intl';

import { copyText } from '@/app/lib/clipboard';
import { cn } from '@/app/lib/utils';

import { Icon } from '@/app/ui/icons';
import { toast } from '@/app/ui/toast';

type CopyButtonProps = {
  /** What goes to the clipboard: the figure as the bank wants it, a phone, an account. */
  value: string;
  /** Which datum, read after the verb: «Copiar el teléfono». */
  label: string;
  /** The button's words; «Copiar» by default. */
  children?: ReactNode;
  variant?: 'text' | 'outline';
  className?: string;
};

/** How long «Copiado» stays before the button offers to copy again. */
const copiedForMs = 2000;

const variants = {
  text: 'min-h-touch px-2 text-label-lg text-primary hover:bg-blue-50',
  outline:
    'h-control-lg w-full border border-border bg-white-50 px-6 text-label-lg text-primary shadow-sm hover:bg-white-200',
};

/*
 * Copies one datum of the payment to the clipboard and says so in place,
 * as the app's «Copiar» does: the words turn into «Copiado» for a moment,
 * read aloud, and the button keeps its size. When the browser refuses the
 * clipboard, the old way is tried; if that fails too, the person is told to
 * copy it by hand, so nothing stale is pasted in the bank.
 */
export function CopyButton({
  value,
  label,
  children,
  variant = 'text',
  className,
}: CopyButtonProps) {
  const t = useTranslations('billing.pay');
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = async () => {
    if (!(await copyText(value))) {
      toast.error(t('copyFailed'));
      return;
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setCopied(false);
    }, copiedForMs);
  };

  return (
    <button
      type="button"
      onClick={() => {
        void copy();
      }}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg whitespace-nowrap transition-colors duration-fast ease-house outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px',
        variants[variant],
        className,
      )}
    >
      <Icon
        icon={copied ? Check : ContentCopy}
        size={18}
        className={cn(
          'transition-colors duration-fast ease-house',
          copied && 'text-success',
        )}
      />
      <span aria-live="polite">
        {copied ? t('copied') : (children ?? t('copy'))}
      </span>
      <span className="sr-only">{label}</span>
    </button>
  );
}
