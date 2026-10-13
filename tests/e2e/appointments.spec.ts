import { expect, test } from '@playwright/test';

/*
 * The patient's appointments (M6) and the review wall before them (M7). The
 * page is the patient's own: a stranger is sent to sign in and brought
 * back. Signing in itself opens the provider's window, so the signed-in
 * page — the list, the tabs, the wall — is covered by the component tests
 * (MSW), as `/i` and `/a` are.
 */

test('asks a stranger to sign in and keeps the way back', async ({ page }) => {
  await page.goto('/appointments');

  await expect(page).toHaveURL(/\/sign-in\?redirect=%2Fappointments$/);
  await expect(
    page.getByRole('button', { name: 'Continuar con Google' }),
  ).toBeVisible();
});

test('is never indexed', async ({ request }) => {
  const response = await request.get('/appointments');

  expect(response.status()).toBe(200);
  expect(await response.text()).toMatch(/<meta name="robots" content="noindex/);
});
