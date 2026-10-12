import { expect, test } from '@playwright/test';

import { auditAccessibility, waitForContent } from './helpers';

/*
 * The session (M2): the sign-in page with Google and Apple, the same
 * accounts as the app; a segment that needs a session sends a stranger to
 * sign in and remembers where to bring them back. Signing in itself opens
 * the provider's window: it is not driven here.
 */

test('the sign-in page offers Google and Apple, and nothing else', async ({
  page,
}) => {
  await page.goto('/entrar');

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Inicia sesión de manera rápida y segura',
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Continuar con Google' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Continuar con Apple' }),
  ).toBeVisible();
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    /noindex/,
  );
  expect(await auditAccessibility(page)).toEqual([]);
});

test('the specialist area asks a stranger to sign in and keeps the way back', async ({
  page,
}) => {
  await page.goto('/panel');

  await expect(page).toHaveURL(/\/entrar\?redirect=%2Fpanel$/);
  await expect(
    page.getByRole('button', { name: 'Continuar con Google' }),
  ).toBeVisible();
});

test('the landing leads to the sign-in page', async ({ page }) => {
  await page.goto('/');
  await waitForContent(page);

  // On a phone «Entrar» lives in the menu under the bar.
  const inline = page.getByRole('link', { name: 'Entrar' });
  if (!(await inline.isVisible())) {
    await page.getByRole('button', { name: 'Abrir el menú' }).click();
  }
  await page.getByRole('link', { name: 'Entrar' }).click();

  await expect(page).toHaveURL(/\/entrar$/);
});
