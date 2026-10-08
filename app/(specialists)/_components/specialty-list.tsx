import School from '@material-symbols/svg-400/rounded/school.svg?svgr';
import { useTranslations } from 'next-intl';

import type { SpecialistProfile } from '@/app/lib/schemas/specialists';

import { Icon } from '@/app/ui/icons';

import { ProfilePlaceholder } from './profile-section';

type Specialty = SpecialistProfile['specialties'][number];

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
}: {
  specialties: SpecialistProfile['specialties'];
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
          <Icon icon={School} size={18} className="text-primary" />
          <span className="line-clamp-2">
            <strong className="font-semibold">{specialty.name}</strong>
            {specialty.college ? `: ${specialty.college}` : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
