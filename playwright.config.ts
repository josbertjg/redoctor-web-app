import { defineConfig, devices } from '@playwright/test';

import { vercelStorageState } from './tests/e2e/global-setup';

/*
 * End-to-end tests run against a production build. Locally Playwright builds
 * and starts the app itself, on its own port: :3000 is `pnpm dev`'s, and a
 * dev server answering there would be reused and tested instead of the
 * build. In CI against a Vercel preview, set PLAYWRIGHT_BASE_URL and no
 * server is started (plus VERCEL_AUTOMATION_BYPASS_SECRET when previews are
 * protected).
 */
const localPort = 3300;
const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = externalBaseUrl ?? `http://localhost:${String(localPort)}`;
const isCi = Boolean(process.env.CI);
const bypassesProtection = Boolean(process.env.VERCEL_AUTOMATION_BYPASS_SECRET);

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  reporter: isCi ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    ...(bypassesProtection ? { storageState: vercelStorageState } : {}),
  },
  // Patients arrive from WhatsApp on phones: mobile profiles first.
  projects: [
    { name: 'iphone-13', use: { ...devices['iPhone 13'] } },
    { name: 'pixel-7', use: { ...devices['Pixel 7'] } },
  ],
  ...(externalBaseUrl
    ? {}
    : {
        webServer: {
          command: `pnpm build && pnpm start -p ${String(localPort)}`,
          url: baseURL,
          reuseExistingServer: !isCi,
          timeout: 180_000,
        },
      }),
});
