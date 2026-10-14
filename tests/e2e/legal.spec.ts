import { expect, test } from '@playwright/test';

import { auditAccessibility, waitForContent } from './helpers';

/*
 * The legal pages (M10): public, accessible, every word from the catalog.
 * They are indexable in production (the sitemap lists them); a preview or
 * a local build marks every page noindex from the root, so only the
 * header the private pages carry is asserted here. The documents' content
 * is the lawyer's to judge.
 */

const pages = [
  { path: '/terms', title: 'Términos y condiciones de uso' },
  { path: '/privacy', title: 'Política de privacidad' },
  { path: '/delete-account', title: 'Eliminar mi cuenta' },
];

for (const { path, title } of pages) {
  test(`${path} is public and accessible`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    expect(response?.headers()['x-robots-tag']).toBeUndefined();
    await waitForContent(page);

    await expect(
      page.getByRole('heading', { level: 1, name: title }),
    ).toBeVisible();
    expect(await auditAccessibility(page)).toEqual([]);
  });
}

test('the terms lead to the privacy policy and to the account deletion', async ({
  page,
}) => {
  await page.goto('/terms');
  await waitForContent(page);

  await page
    .getByRole('link', { name: 'Eliminar mi cuenta', exact: true })
    .click();
  await expect(page).toHaveURL(/\/delete-account$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Eliminar mi cuenta' }),
  ).toBeVisible();

  await page
    .getByRole('link', { name: 'Política de privacidad', exact: true })
    .click();
  await expect(page).toHaveURL(/\/privacy$/);
});
