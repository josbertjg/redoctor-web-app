import Book2 from '@material-symbols/svg-400/rounded/book_2.svg?svgr';
import School from '@material-symbols/svg-400/rounded/school.svg?svgr';
import WorkspacePremium from '@material-symbols/svg-400/rounded/workspace_premium.svg?svgr';
import { useTranslations } from 'next-intl';

import type { SpecialistProfile } from '@/app/lib/schemas/specialists';
import { cn } from '@/app/lib/utils';

import { Icon } from '@/app/ui/icons';

import { ProfilePlaceholder } from './profile-section';

/** What the list shows of a specialty: its catalog id plays no part here. */
type Specialty = Omit<SpecialistProfile['specialties'][number], 'id'>;

/** Parents before their children: «Medicina» before «Medicina › Cardiología». */
function byPath(a: Specialty, b: Specialty): number {
  const length = Math.min(a.path.length, b.path.length);
  for (let index = 0; index < length; index += 1) {
    const order = (a.path[index] ?? '').localeCompare(
      b.path[index] ?? '',
      'es',
    );
    if (order !== 0) return order;
  }
  return a.path.length - b.path.length;
}

/*
 * The verified specialties with the college that backs each one (the app's
 * «Educación» tab). Only verified ones reach this list (AGENTS.md M8).
 */
export function SpecialtyList({
  specialties,
  iconsByDepth = false,
}: {
  specialties: readonly Specialty[];
  /**
   * The public profile's «Educación» (Figma, 2026-11-16): the career, a
   * specialty and what hangs from it each with its icon, a size smaller.
   */
  iconsByDepth?: boolean;
}) {
  const t = useTranslations('specialists');

  if (specialties.length === 0) {
    return (
      <ProfilePlaceholder>{t('noVerifiedSpecialties')}</ProfilePlaceholder>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {[...specialties].sort(byPath).map((specialty) => (
        <li
          key={specialty.path.join('/')}
          className="flex items-start gap-2 text-body-xxs text-on-surface"
        >
          <Icon
            icon={
              !iconsByDepth || specialty.path.length <= 1
                ? School
                : specialty.path.length === 2
                  ? Book2
                  : WorkspacePremium
            }
            size={iconsByDepth ? 16 : 18}
            className={cn('shrink-0 text-primary', iconsByDepth && 'mt-0.5')}
          />
          <span className="line-clamp-2">
            <strong className="font-semibold">{specialty.name}</strong>
            {specialty.college ? `: ${specialty.college}` : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
