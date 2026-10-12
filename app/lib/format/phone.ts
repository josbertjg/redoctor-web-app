/*
 * Venezuelan mobile numbers (AGENTS.md §9: `+58`). The pilot's patients are
 * in Venezuela, so the web asks for the national number and adds the
 * country code; the app also lets one pick another country, which can come
 * later. A mobile number is 4XX and seven digits, XX being an operator's
 * code: Digitel 412/422, Movistar 414/424, Movilnet 416/426.
 */

export const venezuelaCode = '+58';

const mobileNumber = /^4(?:12|14|16|22|24|26)\d{7}$/;

export type PhoneProblem = 'empty' | 'invalidFormat';

/** The national digits, without a leading 0 or the country code: 4141234567. */
export function nationalDigits(value: string): string {
  let digits = value.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('58')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

export function phoneProblem(value: string): PhoneProblem | null {
  const digits = nationalDigits(value);
  if (digits === '') return 'empty';
  return mobileNumber.test(digits) ? null : 'invalidFormat';
}

/** As the API stores it: `+584141234567`. */
export function toInternationalPhone(value: string): string {
  return `${venezuelaCode}${nationalDigits(value)}`;
}

/** As people write it in Venezuela: `0414 123 4567`. */
export function formatNationalPhone(value: string): string {
  const digits = nationalDigits(value);
  if (digits.length !== 10) return value;
  return `0${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}
