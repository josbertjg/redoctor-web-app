'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';

import Close from '@material-symbols/svg-400/rounded/close.svg?svgr';
import { useTranslations } from 'next-intl';
import { Dialog } from 'radix-ui';

import { cn } from '@/app/lib/utils';

import { Icon } from './icons';
import { m, useDragControls, useReducedMotion } from './motion';
import { MotionProvider } from './motion/provider';

type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  /** The body: it scrolls between the fixed title and the fixed footer. */
  children: ReactNode;
  /** The primary action, always in view at the bottom (AGENTS.md §8.8). */
  footer?: ReactNode;
  className?: string;
};

/** How far down, or how fast, a drag has to go to close the sheet. */
const closeDistance = 120;
const closeSpeed = 600;

/*
 * The one sheet (AGENTS.md §8.8): a bottom sheet on phones, dragged down by
 * its handle to close, and a centred dialog from tablets up. Radix gives
 * the focus trap, Escape, the overlay's click, the scroll lock and the
 * labels; Motion the drag. The body scrolls between a fixed title and a
 * fixed footer, so the primary action never leaves the screen, keyboard
 * open included (dvh). A flow with several steps changes them inside the
 * same sheet: one sheet at a time.
 *
 * The sheets are controlled, with no Radix trigger, so Radix cannot give the
 * focus back on closing: the sheet remembers what had it when it opened —
 * the button that opened it — and returns it there.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: SheetProps) {
  const t = useTranslations();
  const drag = useDragControls();
  const reduced = useReducedMotion();
  const opener = useRef<HTMLElement | null>(null);

  // Before Radix moves the focus inside (its effect runs after this one).
  useLayoutEffect(() => {
    if (!open) return;
    opener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
        <MotionProvider>
          <Dialog.Content
            asChild
            {...(description ? {} : { 'aria-describedby': undefined })}
            onCloseAutoFocus={(event) => {
              const target = opener.current;
              opener.current = null;
              if (target?.isConnected) {
                event.preventDefault();
                target.focus();
              }
            }}
          >
            <m.div
              drag={reduced ? false : 'y'}
              dragControls={drag}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 1 }}
              onDragEnd={(_, info) => {
                if (
                  info.offset.y > closeDistance ||
                  info.velocity.y > closeSpeed
                ) {
                  onOpenChange(false);
                }
              }}
              className={cn(
                'fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-2xl bg-background shadow-lg outline-none',
                'data-[state=closed]:animate-sheet-down data-[state=open]:animate-sheet-up',
                'sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-h-[85dvh] sm:w-[calc(100%-2*var(--spacing-gutter))] sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl',
                'sm:data-[state=closed]:animate-fade-out sm:data-[state=open]:animate-scale-in',
                className,
              )}
            >
              <div
                aria-hidden="true"
                onPointerDown={(event) => {
                  drag.start(event);
                }}
                className="flex shrink-0 cursor-grab touch-none justify-center pt-3 pb-1 sm:hidden"
              >
                <span className="h-1.5 w-10 rounded-full bg-grey-300" />
              </div>
              <header className="flex shrink-0 items-start gap-3 px-gutter pt-2 pb-3 sm:px-6 sm:pt-6">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <Dialog.Title className="text-title-lg text-text-primary">
                    {title}
                  </Dialog.Title>
                  {description ? (
                    <Dialog.Description className="text-body-md text-text-secondary">
                      {description}
                    </Dialog.Description>
                  ) : null}
                </div>
                <Dialog.Close
                  aria-label={t('close')}
                  className="-mt-2 -mr-2 flex size-touch shrink-0 items-center justify-center rounded-full text-text-secondary transition-colors duration-fast ease-house outline-none hover:bg-white-200 focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <Icon icon={Close} size={24} />
                </Dialog.Close>
              </header>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-gutter pb-4 sm:px-6">
                {children}
              </div>
              {footer ? (
                <footer className="shrink-0 border-t border-divider px-gutter pt-3 pb-[max(env(safe-area-inset-bottom),--spacing(3))] sm:px-6 sm:pb-6">
                  {footer}
                </footer>
              ) : null}
            </m.div>
          </Dialog.Content>
        </MotionProvider>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
