import { expect, test } from '@playwright/test';

/*
 * The specialist's payment (M13) at `/pay`, out of the paths the app opens
 * (AGENTS.md §6), inside the panel's frame. The page is the specialist's
 * own: a stranger is sent to sign in and brought back. Signing in itself
 * opens the provider's window, so the signed-in page — the plans, the
 * payment — is covered by the component tests (MSW), as `/appointments` is.
 */

test('asks a stranger to sign in and keeps the way back, the plan asked included', async ({
  page,
}) => {
  await page.goto('/pay?plan=profesional');

  await expect(page).toHaveURL(
    /\/sign-in\?redirect=%2Fpay%3Fplan%3Dprofesional$/,
  );
  await expect(
    page.getByRole('button', { name: 'Continuar con Google' }),
  ).toBeVisible();
});

test('is never indexed', async ({ request }) => {
  const response = await request.get('/pay');

  expect(response.status()).toBe(200);
  expect(await response.text()).toMatch(/<meta name="robots" content="noindex/);
});

// Its address inside the panel for a few hours (v0.19.0–v0.22.0) has no
// redirect, on purpose: no link that leaves the web ever named it.
test('its old address inside the panel is gone', async ({ request }) => {
  const response = await request.get('/panel/subscription/pay', {
    maxRedirects: 0,
  });

  expect(response.status()).toBe(404);
});
