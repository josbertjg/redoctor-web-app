import 'server-only';

import manifest from '../../package.json';

/**
 * The web's version, as `package.json` says it — every commit bumps it
 * (AGENTS.md §0) —, so the footer tells which one is live. Server only: it
 * comes from the whole manifest, which must not travel to the browser.
 */
export const appVersion: string = manifest.version;
