import { expect, test } from '@playwright/test';

import {
  people,
  signInWith,
  test as signedInTest,
  wipeOpened,
} from './signed-in';

/*
 * The specialist's panel (M14): every section is the specialist's own, so
 * a stranger is sent to sign in and brought back to the same address — the
 * daily summary's day included. Signed in, the sections are covered by the
 * component tests (MSW). A browser whose session was a specialist's never
 * sees the landing: the server sends it to the panel.
 */

const sections = [
  '/panel',
  '/panel/agenda',
  '/panel/agenda/2026-10-14',
  '/panel/appointments',
  '/panel/reports',
  '/panel/profile',
  '/panel/specialties',
  '/panel/subscription',
  '/panel/subscription/invoices',
  '/panel/subscription/invoices/2a2a2a2a-2a2a-4a2a-8a2a-2a2a2a2a2a2a',
  '/panel/subscription/balance',
  '/panel/subscription/coupons',
];

for (const path of sections) {
  test(`${path} asks a stranger to sign in and keeps the way back`, async ({
    page,
  }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);

    await expect(page).toHaveURL(
      new RegExp(`/sign-in\\?redirect=${encodeURIComponent(path)}$`),
    );
  });
}

test('the panel is never indexed', async ({ request }) => {
  for (const path of sections) {
    const response = await request.get(path);
    expect(await response.text()).toMatch(
      /<meta name="robots" content="noindex/,
    );
  }
});

test('a specialist’s browser goes to the panel, never to the landing', async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([
    { name: 'redoctor-panel', value: '1', url: baseURL ?? 'http://localhost' },
  ]);

  const response = await page.request.get('/', { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(
    new URL(response.headers().location ?? '', 'http://localhost').pathname,
  ).toBe('/panel');
});

signedInTest(
  'signing out from /panel when /identity/me fails redirects straight to /sign-in',
  async ({ page, providers }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    providers.next = people.doctor;
    await page.route('**/api/v1/identity/me', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'ERR_9999',
          message: 'An internal error occurred',
        }),
      }),
    );

    await page.goto('/sign-in');
    await signInWith(page);
    await expect(
      page.getByRole('heading', { name: 'No pudimos leer tu cuenta' }),
    ).toBeVisible({ timeout: 15_000 });

    await page.goto('/panel');
    await expect(
      page.getByRole('heading', { name: 'No pudimos leer tu cuenta' }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole('button', { name: 'Entrar con otra cuenta' }),
    ).toBeVisible();

    // Simulate a cold serverless render of `/sign-in` (> 600ms): the wipe must
    // keep covering `/panel` until `/sign-in` lands, never opening on skeletons.
    await page.route('**/sign-in?**', async (route) => {
      await new Promise((resolve) => {
        setTimeout(resolve, 1500);
      });
      await route.continue();
    });

    await page.getByRole('button', { name: 'Tu cuenta' }).click();
    await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click();
    await wipeOpened(page);

    expect(new URL(page.url()).pathname).toBe('/sign-in');
  },
);
