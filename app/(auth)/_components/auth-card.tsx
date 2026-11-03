import { useId, type ReactNode } from 'react';

import ArrowBack from '@material-symbols/svg-400/rounded/arrow_back.svg?svgr';
import { useTranslations } from 'next-intl';

import { cn } from '@/app/lib/utils';

import { Icon, type IconComponent } from '@/app/ui/icons';

/** The card's white surface on the blue scene: its skeleton and its errors wear it too. */
export const authSurfaceClass =
  'w-full max-w-md rounded-2xl bg-pure-white px-6 py-5 shadow-md';

/** The links of a card's last line: «Regístrate», «Inicia sesión». */
export const authLinkClass =
  'rounded-sm font-semibold text-text-primary underline underline-offset-2 outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50';

type AuthCardProps = {
  /** The card's emblem, in the blue-50 circle over the title. */
  icon: IconComponent;
  title: ReactNode;
  description?: ReactNode;
  /** The step behind, when there is one: the arrow at the card's top left. */
  onBack?: (() => void) | undefined;
  /** The line under the card's content: «¿Ya tienes una cuenta? Inicia sesión». */
  footer?: ReactNode;
  /** 1 when the card is the page; 2 inside a page with its own title. */
  headingLevel?: 1 | 2;
  className?: string;
  children?: ReactNode;
};

/*
 * The card of the way in (the designer's frames of 2026-10-30): white on the
 * blue scene, the arrow back when a step is behind, the emblem in its
 * circle, the title and its line, the step's content, and the line that
 * leads to the other door (sign in ↔ sign up). Every step of `/sign-in`
 * and `/sign-up` is one of these, so they read as one place.
 */
export function AuthCard({
  icon,
  title,
  description,
  onBack,
  footer,
  headingLevel = 1,
  className,
  children,
}: AuthCardProps) {
  const t = useTranslations();
  const headingId = useId();
  const Heading = headingLevel === 1 ? 'h1' : 'h2';

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        authSurfaceClass,
        'flex animate-fade-up flex-col gap-7',
        className,
      )}
    >
      <div className="flex flex-col gap-2.5">
        {onBack === undefined ? null : (
          <button
            type="button"
            onClick={onBack}
            aria-label={t('back')}
            className="-ml-2.5 inline-flex size-11 items-center justify-center rounded-full text-text-primary transition-colors duration-fast ease-house outline-none hover:bg-surface-variant focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Icon icon={ArrowBack} size={24} />
          </button>
        )}
        <div className="flex flex-col items-center gap-4.5">
          <span className="flex size-15 items-center justify-center rounded-full bg-blue-50 text-primary">
            <Icon icon={icon} className="size-8" />
          </span>
          <div className="flex flex-col gap-2.5 text-center">
            <Heading
              id={headingId}
              className="text-subtitle-l font-bold text-balance text-text-primary"
            >
              {title}
            </Heading>
            {description === undefined ? null : (
              <p className="text-body-lg text-pretty text-grey-800">
                {description}
              </p>
            )}
          </div>
          {children === undefined ? null : (
            <div className="w-full">{children}</div>
          )}
        </div>
      </div>
      {footer === undefined ? null : (
        <div className="text-center text-body-sm text-grey-800">{footer}</div>
      )}
    </section>
  );
}
