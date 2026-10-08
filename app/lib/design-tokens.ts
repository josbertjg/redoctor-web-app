import 'server-only';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/*
 * For the few places that need a token's raw value outside CSS (the web
 * manifest, generated Open Graph images): read it from app/ui/tokens.css, so
 * tokens keep living in exactly one file (AGENTS.md §7).
 */
const tokens = readFileSync(join(process.cwd(), 'app/ui/tokens.css'), 'utf8');

/** The hex value of a color token, e.g. `colorToken('blue-500')` → `#0000dc`. */
export function colorToken(name: string): string {
  const match = new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{3,8})\\s*;`).exec(
    tokens,
  );
  if (!match?.[1]) {
    throw new Error(`Unknown color token: --color-${name}`);
  }
  return match[1];
}
