'use client';

import CheckCircle from '@material-symbols/svg-400/rounded/check_circle.svg?svgr';
import ErrorIcon from '@material-symbols/svg-400/rounded/error.svg?svgr';
import Info from '@material-symbols/svg-400/rounded/info.svg?svgr';
import ProgressActivity from '@material-symbols/svg-400/rounded/progress_activity.svg?svgr';
import Warning from '@material-symbols/svg-400/rounded/warning.svg?svgr';
import { Toaster as SonnerToaster, toast } from 'sonner';

import { Icon } from '@/app/ui/icons';

/* Floating, at the top, dismissible, 5 s (AGENTS.md §8, Toast). */
const TOAST_DURATION_MS = 5000;

type ToasterProps = {
  /** Accessible name of the notifications region (i18n: `common.notifications`). */
  regionLabel: string;
  /** Accessible name of the close button (i18n: `common.close`). */
  closeLabel: string;
};

/*
 * Mounted once, in app/providers.tsx. Show a toast from anywhere with
 * `toast('…')`, `toast.success('…')`, `toast.error('…', { description })`.
 * Sonner announces each toast through aria-live.
 */
export function Toaster({ regionLabel, closeLabel }: ToasterProps) {
  return (
    <SonnerToaster
      position="top-center"
      duration={TOAST_DURATION_MS}
      closeButton
      containerAriaLabel={regionLabel}
      icons={{
        success: <Icon icon={CheckCircle} size={20} className="text-success" />,
        error: <Icon icon={ErrorIcon} size={20} className="text-error" />,
        warning: <Icon icon={Warning} size={20} className="text-warning-700" />,
        info: <Icon icon={Info} size={20} className="text-info" />,
        loading: (
          <Icon
            icon={ProgressActivity}
            size={20}
            className="animate-spin text-text-secondary motion-reduce:animate-none"
          />
        ),
      }}
      toastOptions={{
        unstyled: true,
        closeButtonAriaLabel: closeLabel,
        classNames: {
          toast:
            'group border-divider bg-surface text-text-primary flex w-full items-start gap-3 rounded-lg border p-4 shadow-lg',
          icon: 'mt-0.5 flex shrink-0 items-center',
          content: 'flex min-w-0 flex-1 flex-col gap-1',
          title: 'text-label-lg',
          // grey-700: the secondary grey reads 4.4:1 on the toast's surface, under AA.
          description: 'text-body-md text-grey-700',
          actionButton:
            'h-control text-label-md bg-primary text-on-primary ml-2 shrink-0 rounded-full px-4',
          cancelButton:
            'h-control text-label-md bg-surface-variant text-text-primary ml-2 shrink-0 rounded-full px-4',
          closeButton:
            // Sonner renders the button first; `order-last` puts it at the end.
            'order-last min-h-touch min-w-touch text-text-secondary hover:bg-surface-variant focus-visible:ring-ring/50 -my-2 -mr-2 ml-auto flex shrink-0 items-center justify-center rounded-full transition-colors duration-fast ease-house outline-none focus-visible:ring-3',
        },
      }}
    />
  );
}

export { toast };
