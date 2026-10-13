/*
 * Venezuelan identity documents as the API takes them (AGENTS.md §9): a type
 * — V (Venezuelan), E (foreign resident), P (passport), J and G (legal
 * entity, government) — and 6 to 8 digits. The app also offers R and lets
 * P, J and G reach 9 digits; the API accepts neither, so the web follows
 * the API.
 */

export const documentTypes = ['V', 'E', 'P', 'J', 'G'] as const;

export type DocumentType = (typeof documentTypes)[number];

export const documentNumberLength = { min: 6, max: 8 } as const;

export type DocumentNumberProblem =
  'empty' | 'onlyDigits' | 'minLength' | 'maxLength';

/** The digits alone: «12.345.678» is 12345678. */
export function cleanDocumentNumber(value: string): string {
  return value.replace(/\D/g, '');
}

export function documentNumberProblem(
  value: string,
): DocumentNumberProblem | null {
  const digits = cleanDocumentNumber(value);
  if (digits === '') return 'empty';
  // Dots, spaces and hyphens are how people write it; a letter (a passport's
  // «AT…») is not a digit the API takes, and dropping it would save another number.
  if (/[^\d.\s-]/.test(value.trim())) return 'onlyDigits';
  if (digits.length < documentNumberLength.min) return 'minLength';
  if (digits.length > documentNumberLength.max) return 'maxLength';
  return null;
}

export function isDocumentType(value: string): value is DocumentType {
  return (documentTypes as readonly string[]).includes(value);
}

/** As the app shows it: `V-12345678`. */
export function formatIdentityDocument(
  type: DocumentType,
  number: string,
): string {
  return `${type}-${cleanDocumentNumber(number)}`;
}
