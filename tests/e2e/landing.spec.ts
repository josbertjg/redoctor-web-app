import { expect, test } from '@playwright/test';

import { waitForContent } from './helpers';
import manifest from '../../package.json';

/*
 * The landing's welcome: the splash veil on a session's first visit, and
 * the promise that stays readable for assistive technology while its
 * letters animate.
 */

test('the splash greets the first visit of a session and not the next', async ({
  page,
}) => {
  await page.goto('/');
  const veil = page.locator('[data-splash]');
  await expect(veil).toBeAttached();
  // The logo's runtime, served from this origin, draws under the CSP.
  await expect(veil.locator('canvas')).toBeAttached({ timeout: 5_000 });

  await waitForContent(page);
  await expect(veil).toHaveCount(0);
  const cookies = await page.context().cookies();
  expect(cookies.some((cookie) => cookie.name === 'redoctor-splash')).toBe(
    true,
  );

  await page.reload();
  await waitForContent(page);
  await expect(page.locator('[data-splash]')).toHaveCount(0);
});

test('the promise keeps its words while the letters enter', async ({
  page,
}) => {
  await page.goto('/');
  await waitForContent(page);

  await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName(
    /Confianza, salud y gestión eficiente,\s*en un solo click\./,
  );
});

test('the footer tells which version of the web is live', async ({ page }) => {
  await page.goto('/');
  await waitForContent(page);

  await expect(
    page.getByRole('contentinfo').getByText(`Versión: ${manifest.version}`),
  ).toBeVisible();
});
