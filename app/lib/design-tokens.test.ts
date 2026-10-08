// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { colorToken } from './design-tokens';

describe('colorToken', () => {
  it('reads a color from tokens.css', () => {
    expect(colorToken('blue-500')).toBe('#0000dc');
    expect(colorToken('green-500')).toBe('#2faf7e');
  });

  it('fails loudly for an unknown token', () => {
    expect(() => colorToken('purple-500')).toThrow(/purple-500/);
  });
});
