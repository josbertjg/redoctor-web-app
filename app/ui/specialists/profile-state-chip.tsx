'use client';

import Link from 'next/link';

import Schedule from '@material-symbols/svg-400/rounded/schedule.svg?svgr';
import Update from '@material-symbols/svg-400/rounded/update.svg?svgr';
import Visibility from '@material-symbols/svg-400/rounded/visibility.svg?svgr';
import VisibilityOff from '@material-symbols/svg-400/rounded/visibility_off.svg?svgr';
import Warning from '@material-symbols/svg-400/rounded/warning.svg?svgr';

import {
  activationTone,
  type ActivationTone,
} from '@/app/lib/profile/activation';
import { routes } from '@/app/lib/routes';
import { cn } from '@/app/lib/utils';

import { Icon, type IconComponent } from '@/app/ui/icons';

import { useSession } from '@/app/hooks/use-session';

/** The badge's words, translated on the server (the frame carries no `profile` namespace). */
export type ProfileStateLabels = Record<ActivationTone, string>;

/** The app's badge colours and icons, tone by tone (`profile_activation_ui.dart`). */
const looks: Record<
  ActivationTone,
  { icon: IconComponent; className: string }
> = {
  active: { icon: Visibility, className: 'bg-green-50 text-green-500' },
  underReview: { icon: Schedule, className: 'bg-blue-50 text-primary' },
  pendingVerification: {
    icon: Update,
    className: 'bg-warning-50 text-warning-500',
  },
  inactive: { icon: VisibilityOff, className: 'bg-pure-white text-grey-500' },
  actionNeeded: { icon: Warning, className: 'bg-error-50 text-error-500' },
};

/*
 * The profile's state at the top of the panel, as the app's badge in its
 * bar: active, in review, a sign-up to finish, inactive, or something to
 * fix. A link to «Mi perfil», where the whole state is told. Nothing for
 * an account with no professional profile (an admin's).
 */
export function ProfileStateChip({
  labels,
  className,
}: {
  labels: ProfileStateLabels;
  className?: string;
}) {
  const { account } = useSession();
  if (!account?.specialist.exists) return null;
  const tone = activationTone(account);
  const look = looks[tone];

  return (
    <Link
      href={routes.specialistProfile()}
      className={cn(
        'inline-flex min-h-7 animate-fade-in items-center gap-1.5 rounded-full px-2.5 py-1 text-label-md shadow-xs transition-[translate] duration-fast ease-house outline-none hover:-translate-y-px focus-visible:ring-3 focus-visible:ring-white-50/70',
        look.className,
        className,
      )}
    >
      <Icon icon={look.icon} size={16} className="shrink-0" />
      {/* On a phone the bar has room for the icon alone: the words stay its name. */}
      <span className="whitespace-nowrap max-sm:sr-only">{labels[tone]}</span>
    </Link>
  );
}
