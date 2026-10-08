import { expect, test } from '@playwright/test';

import { auditAccessibility } from './helpers';

/*
 * The public profile (M8) against the real API (api-dev): rendered on the
 * server, read-only, with «Abrir en la app» and the pilot's booking note.
 * The specialist is api-dev's test profile; override it with
 * E2E_SPECIALIST_ID when it changes. Names are not asserted: real data.
 */
const specialistId =
  process.env.E2E_SPECIALIST_ID ?? 'a0af9566-a53d-4887-8d16-1dfc589c2f3d';
const profilePath = `/s/${specialistId}`;

test('a shared profile shows the specialist and the way to the app', async ({
  page,
}) => {
  const response = await page.goto(`${profilePath}?origin=share-profile`);
  expect(response?.status()).toBe(200);

  const name = page.getByRole('heading', { level: 1 });
  await expect(name).toBeVisible();
  await expect(name).not.toHaveText('');

  // The channel tag is read once and taken off the address bar.
  await expect(page).toHaveURL(new RegExp(`${profilePath}$`));
  // Streamed metadata can leave the tag in head and body; every copy is clean.
  const canonicals = await page
    .locator('link[rel="canonical"]')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  expect(canonicals.length).toBeGreaterThan(0);
  for (const href of canonicals) {
    expect(href).toMatch(new RegExp(`${profilePath}$`));
  }

  await expect(
    page.getByText(
      'Pronto podrás agendar aquí; por ahora pídele tu cita a tu especialista.',
    ),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Abrir en la app' }),
  ).toHaveAttribute('href', /^(redoctor|intent):\/\//);
  await expect(
    page.getByRole('heading', { level: 2, name: 'Opiniones' }),
  ).toBeVisible();

  expect(await auditAccessibility(page)).toEqual([]);
});

test('each office links to its directions', async ({ page }) => {
  await page.goto(profilePath);

  const directions = page.getByRole('link', { name: /^Cómo llegar a / });
  await expect(directions.first()).toHaveAttribute(
    'href',
    /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=-?\d/,
  );
});

test('the preview image of a profile is generated', async ({
  page,
  request,
}) => {
  await page.goto(profilePath);
  const content = await page
    .locator('meta[property="og:image"]')
    .getAttribute('content');
  expect(content).toBeTruthy();

  const imageUrl = new URL(content ?? '');
  const image = await request.get(imageUrl.pathname + imageUrl.search);
  expect(image.status()).toBe(200);
  expect(image.headers()['content-type']).toBe('image/png');
});

for (const missing of [
  '00000000-0000-4000-8000-000000000000',
  'not-a-profile',
]) {
  test(`/s/${missing} says the profile is not available`, async ({ page }) => {
    await page.goto(`/s/${missing}`);

    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Este perfil no está disponible',
      }),
    ).toBeVisible();
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute(
      'content',
      /noindex/,
    );
  });
}
