import 'server-only';

import type { Metadata } from 'next';

import { env } from './env';
import { absoluteUrl } from './site';

/**
 * iOS Smart App Banner for a page the app also opens (AGENTS.md §6):
 * `app-argument` is the page itself, so the banner opens the app right
 * there. Metadata adds it to the HTML from the start: Safari may ignore the
 * tag if it arrives later. Off while the App Store id is empty (pilot).
 */
export function smartAppBanner(path: string): Pick<Metadata, 'itunes'> {
  const appId = env.NEXT_PUBLIC_APP_STORE_ID;
  return appId ? { itunes: { appId, appArgument: absoluteUrl(path) } } : {};
}
