import type { ReactNode } from 'react';

/**
 * The booking's column — the way back, the title, the specialist, then what
 * the page says now — and, under it, the actions that stay at hand at the
 * bottom of the screen while the steps are on.
 */
export function BookingFrame({
  header,
  actions,
  children,
}: {
  header: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-gutter pt-6 pb-10">
        {header}
        {children}
      </div>
      {actions}
    </>
  );
}
