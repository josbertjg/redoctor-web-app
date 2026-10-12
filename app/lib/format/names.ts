/** Up to two initials, from the first two words of the name. */
export function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

/*
 * A first or last name as the API takes it (`POST /identity/register`):
 * letters, with spaces, hyphens or apostrophes between them — María José,
 * Pérez-Gil, D'Ambrosio — at most 100 characters. The app is stricter (no
 * hyphens or apostrophes, at least three letters); the web accepts every
 * name the API accepts.
 */
const personNamePattern = /^\p{L}+(?:[' -]+\p{L}+)*$/u;

export const personNameMaxLength = 100;

export type PersonNameProblem = 'empty' | 'invalidFormat' | 'maxLength';

/** The name as it is sent: trimmed, single spaces, the typographic apostrophe iOS types turned into the plain one. */
export function cleanPersonName(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[’‘`´]/g, "'");
}

export function personNameProblem(value: string): PersonNameProblem | null {
  const name = cleanPersonName(value);
  if (name === '') return 'empty';
  if (name.length > personNameMaxLength) return 'maxLength';
  return personNamePattern.test(name) ? null : 'invalidFormat';
}
