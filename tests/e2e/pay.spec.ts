import { expect, test } from '@playwright/test';

/*
 * The specialist's payment (M13), its own page inside the panel since
 * 2026-10-13. The page is the specialist's own: a stranger is sent to sign
 * in and brought back. Signing in itself opens the provider's window, so
 * the signed-in page — the plans, the payment — is covered by the component
 * tests (MSW), as `/appointments` is.
 */

test('asks a stranger to sign in and keeps the way back', async ({ page }) => {
  await page.goto('/panel/subscription/pay');

  await expect(page).toHaveURL(
    /\/sign-in\?redirect=%2Fpanel%2Fsubscription%2Fpay$/,
  );
  await expect(
    page.getByRole('button', { name: 'Continuar con Google' }),
  ).toBeVisible();
});

test('is never indexed', async ({ request }) => {
  const response = await request.get('/panel/subscription/pay');

  expect(response.status()).toBe(200);
  expect(await response.text()).toMatch(/<meta name="robots" content="noindex/);
});

test('/pay, its first name, leads there for good', async ({ request }) => {
  const response = await request.get('/pay', { maxRedirects: 0 });

  expect(response.status()).toBe(308);
  expect(
    new URL(response.headers().location ?? '', 'http://localhost').pathname,
  ).toBe('/panel/subscription/pay');
});
