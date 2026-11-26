// @vitest-environment node
import { describe, expect, it } from 'vitest';

import messages from './messages/es.json';

function collectMetaTitles(
  node: unknown,
  prefix = '',
): { key: string; value: string }[] {
  if (typeof node !== 'object' || node === null) return [];
  const entries: { key: string; value: string }[] = [];
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (key === 'metaTitle' && typeof value === 'string') {
      entries.push({ key: path, value });
    } else {
      entries.push(...collectMetaTitles(value, path));
    }
  }
  return entries;
}

describe('es.json metaTitle entries', () => {
  it('never hardcodes «· Redoctor» since app/layout.tsx appends it via title.template', () => {
    const offending = collectMetaTitles(messages).filter(({ value }) =>
      value.includes('· Redoctor'),
    );
    expect(offending).toEqual([]);
  });
});
