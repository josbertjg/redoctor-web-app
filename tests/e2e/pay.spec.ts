import { expect, test } from '@playwright/test';

/*
 * The specialist's payment (M13). The page is the specialist's own: a
 * stranger is sent to sign in and brought back. Signing in itself opens the
 * provider's window, so the signed-in page — the subscription, the plans,
 * the payment — is covered by the component tests (MSW), as `/appointments`
 * is.
 */

test('asks a stranger to sign in and keeps the way back', async ({ page }) => {
  await page.goto('/pay');

  await expect(page).toHaveURL(/\/sign-in\?redirect=%2Fpay$/);
  await expect(
    page.getByRole('button', { name: 'Continuar con Google' }),
  ).toBeVisible();
});

test('is never indexed', async ({ request }) => {
  const response = await request.get('/pay');

  expect(response.status()).toBe(200);
  expect(await response.text()).toMatch(/<meta name="robots" content="noindex/);
});
