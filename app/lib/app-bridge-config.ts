import { publicEnv } from './public-env';

import type { AppBridgeConfig } from './deep-links';

/*
 * The app as the web offers it (AGENTS.md §6): its identity and its store
 * listings, empty during the pilot (TestFlight and Play internal testing).
 * While they are empty there are no store buttons and no redirect. Safe for
 * the browser: the «Abrir en la app» button reads it there.
 */
export const appBridgeConfig: AppBridgeConfig = {
  androidPackage: publicEnv.androidPackage,
  appStoreId: publicEnv.appStoreId,
  playStoreId: publicEnv.playStoreId,
};
