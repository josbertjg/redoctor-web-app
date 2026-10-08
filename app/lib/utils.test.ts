import { describe, expect, it } from 'vitest';

import { cn } from './utils';

describe('cn', () => {
  it('keeps a type-scale class next to a color class', () => {
    expect(cn('text-headline-lg text-primary')).toBe(
      'text-headline-lg text-primary',
    );
  });

  it('lets the last conflicting utility win', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('text-body-md', 'text-body-lg')).toBe('text-body-lg');
  });

  it('drops falsy inputs', () => {
    expect(cn('a', false, undefined, null, 0, 'b')).toBe('a b');
  });
});
