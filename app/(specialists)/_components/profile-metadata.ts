import type { SpecialistProfile } from '@/app/lib/schemas/specialists';

/** What the words need from next-intl, handed in so the builder stays pure. */
export type MetaWordsTools = {
  t: (key: string, values?: Record<string, string | number>) => string;
  /** «A y B», «A, B y C». */
  list: (items: string[]) => string;
  /** A rating as the page writes it: «4,5». */
  number: (value: number) => string;
};

/** How many offices the description names before «y N más». */
const NAMED_OFFICES = 2;

/*
 * The profile's title and description for search engines and link
 * previews: the name with the first specialty, then what a patient decides
 * by — the specialties, the verification, the offices, the rating — and the
 * way to book, each sentence from the catalog (`specialists.meta*`).
 */
export function profileMetaWords(
  profile: SpecialistProfile,
  { t, list, number }: MetaWordsTools,
): { title: string; description: string } {
  const { name } = profile;
  const specialties = profile.specialties.map((specialty) => specialty.name);
  const [firstSpecialty] = specialties;
  const title = firstSpecialty
    ? t('specialists.metaTitle', { name, specialty: firstSpecialty })
    : name;

  const sentences = [
    specialties.length > 0
      ? t('specialists.metaSpecialties', {
          name,
          specialties: list(specialties),
        })
      : t('specialists.metaDescription', { name }),
  ];
  if (profile.verified) sentences.push(t('specialists.metaVerified'));

  if (profile.offices.length > 0) {
    const named = profile.offices
      .slice(0, NAMED_OFFICES)
      .map((office) => office.name);
    const more = profile.offices.length - named.length;
    const names =
      more > 0
        ? `${named.join(', ')} ${t('search.officesCount', { count: more })}`
        : list(named);
    sentences.push(
      t('specialists.metaOffices', { count: profile.offices.length, names }),
    );
  }

  const { average, count } = profile.rating;
  if (count > 0 && average !== null) {
    sentences.push(
      t('specialists.metaRating', { rating: number(average), count }),
    );
  }
  sentences.push(t('specialists.metaBook'));

  return { title, description: sentences.join(' ') };
}
