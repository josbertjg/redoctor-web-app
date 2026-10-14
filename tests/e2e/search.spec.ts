import { expect, test } from '@playwright/test';

import { auditAccessibility, waitForContent } from './helpers';

/*
 * The search (M16) against the real API (api-dev): the page with nothing
 * asked, a search rendered on the server, the web's own search endpoint,
 * and the landing's box leading here. Names are not asserted: real data.
 */

test('the page with nothing asked offers the catalog, unindexed', async ({
  page,
}) => {
  const response = await page.goto('/search');
  expect(response?.status()).toBe(200);
  expect(response?.headers()['x-robots-tag']).toBe('noindex, nofollow');
  await waitForContent(page);

  await expect(
    page.getByRole('heading', { level: 1, name: '¿Qué especialista buscas?' }),
  ).toBeVisible();
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute(
    'content',
    /noindex/,
  );
  await expect(
    page.getByRole('search', { name: 'Buscar especialistas' }),
  ).toBeVisible();

  expect(await auditAccessibility(page)).toEqual([]);
});

test('a search in the address is rendered on the server', async ({ page }) => {
  await page.goto('/search?q=Guedez');
  await waitForContent(page);

  // The results, or the honest «nothing found»: both are the page's answer.
  const heading = page.getByRole('heading', { level: 1 });
  await expect(heading).toBeVisible();
  await expect(heading).toHaveText(/especialista|coincidencias/);
  await expect(
    page.getByRole('combobox', {
      name: 'Especialidad o nombre del especialista',
    }),
  ).toHaveValue('Guedez');

  expect(await auditAccessibility(page)).toEqual([]);

  // A tap anywhere on a card (its price, say) opens the profile: the
  // name's link lies over the card, so the tap lands on it, not on the
  // words (`force` skips Playwright's check that the words take the tap).
  const card = page.getByRole('article').first();
  if ((await card.count()) > 0) {
    await card
      .getByText(/\$|A consultar/)
      .first()
      .click({ force: true });
    await expect(page).toHaveURL(/\/s\/[0-9a-f-]{36}$/);
  }
});

test('the web’s own search endpoint answers the API’s page', async ({
  request,
}) => {
  const refused = await request.get('/api/search?lat=10.49&lng=-66.88');
  expect(refused.status()).toBe(400);

  const answered = await request.get('/api/search?q=Guedez&page=1');
  expect(answered.status()).toBe(200);
  expect(answered.headers()['x-robots-tag']).toBe('noindex, nofollow');
  const body = (await answered.json()) as { data: unknown[]; meta: unknown };
  expect(Array.isArray(body.data)).toBe(true);
  expect(body.meta).toBeTruthy();
});

test('the landing’s box leads to the search', async ({ page }) => {
  await page.goto('/');
  await waitForContent(page);

  // The hero's box, not the docked bar's (inert until the page scrolls).
  const box = page
    .getByRole('search', { name: 'Buscar especialistas', exact: true })
    .getByRole('combobox', { name: 'Especialidad o nombre del especialista' });
  await box.fill('Pediatría');
  await box.press('Enter');

  await expect(page).toHaveURL(/\/search\?q=Pediatr%C3%ADa$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
