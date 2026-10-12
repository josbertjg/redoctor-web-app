import { describe, expect, it } from 'vitest';

import {
  cleanDocumentNumber,
  documentNumberProblem,
  formatIdentityDocument,
  isDocumentType,
} from './identity-document';

describe('identity documents', () => {
  it('takes 6 to 8 digits, whatever the punctuation', () => {
    expect(documentNumberProblem('123456')).toBeNull();
    expect(documentNumberProblem('12.345.678')).toBeNull();
    expect(cleanDocumentNumber('12.345.678')).toBe('12345678');
  });

  it('says what is wrong otherwise', () => {
    expect(documentNumberProblem('')).toBe('empty');
    expect(documentNumberProblem('abc')).toBe('empty');
    expect(documentNumberProblem('12345')).toBe('minLength');
    expect(documentNumberProblem('123456789')).toBe('maxLength');
  });

  it('knows the types the API takes and shows them as the app does', () => {
    expect(isDocumentType('V')).toBe(true);
    expect(isDocumentType('R')).toBe(false);
    expect(formatIdentityDocument('E', '81.234.567')).toBe('E-81234567');
  });
});
