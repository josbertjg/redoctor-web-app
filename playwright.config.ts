import { defineConfig, devices } from '@playwright/test';

import { vercelStorageState } from './tests/e2e/global-setup';

/*
 * End-to-end tests run against a production build. Locally Playwright builds
 * and starts the app itself; in CI against a Vercel preview, set
 * PLAYWRIGHT_BASE_URL and no server is started (plus
 * VERCEL_AUTOMATION_BYPASS_SECRET when previews are protected).
 */
const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = externalBaseUrl ?? 'http://localhost:3000';
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
          command: 'pnpm build && pnpm start',
          url: baseURL,
          reuseExistingServer: !isCi,
          timeout: 180_000,
        },
      }),
});
