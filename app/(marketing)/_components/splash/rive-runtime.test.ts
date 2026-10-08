import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/*
 * The Rive runtime fetches its WebAssembly from a CDN unless told where ours
 * is (rive-logo.tsx): public/animations/rive.wasm is a copy of the package's
 * own, and an update of the package must bring the copy along.
 */
describe('the Rive runtime', () => {
  it('is served from this origin, in the version the package ships', () => {
    const here = createRequire(import.meta.url);
    const fromReact = createRequire(
      here.resolve('@rive-app/react-canvas-lite'),
    );
    const packageDir = path.dirname(
      fromReact.resolve('@rive-app/canvas-lite/package.json'),
    );
    const shipped = readFileSync(path.join(packageDir, 'rive.wasm'));
    const served = readFileSync(
      path.resolve(process.cwd(), 'public/animations/rive.wasm'),
    );

    expect(served.equals(shipped)).toBe(true);
  });
});
