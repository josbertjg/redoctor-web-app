import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

import { request, type FullConfig } from '@playwright/test';

/*
 * Vercel previews sit behind Deployment Protection. With
 * VERCEL_AUTOMATION_BYPASS_SECRET (Vercel → Deployment Protection →
 * Protection Bypass for Automation), one request carries the secret and
 * Vercel answers with a cookie for its own domain; the tests then browse
 * with that cookie. The secret never travels with the page's other requests
 * (the API, Firebase, PostHog, Sentry).
 */
export const vercelStorageState = 'playwright/.cache/vercel-bypass.json';

export default async function globalSetup(config: FullConfig) {
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  const baseURL = config.projects[0]?.use.baseURL;
  if (!secret || !baseURL) return;

  const context = await request.newContext({ baseURL });
  const response = await context.get('/', {
    headers: {
      'x-vercel-protection-bypass': secret,
      'x-vercel-set-bypass-cookie': 'samesitenone',
    },
  });
  if (!response.ok()) {
    throw new Error(
      `The preview did not accept the bypass secret (${String(response.status())})`,
    );
  }
  await mkdir(dirname(vercelStorageState), { recursive: true });
  await context.storageState({ path: vercelStorageState });
  await context.dispose();
}
