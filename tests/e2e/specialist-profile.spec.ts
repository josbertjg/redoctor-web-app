import { expect, test } from '@playwright/test';

import { auditAccessibility, e2eSpecialistId as specialistId } from './helpers';

/*
 * The public profile (M8) against the real API (api-dev): rendered on the
 * server, with «Abrir en la app» and «Agendar cita» (M15), its structured
 * data for search engines, and a real 404 for a profile that is not there.
 * Names are not asserted: real data.
 */
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
    page.getByRole('link', { name: 'Agendar cita' }),
  ).toHaveAttribute('href', `/book/${specialistId}`);
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

test('the profile carries its structured data for search engines', async ({
  page,
}) => {
  await page.goto(profilePath);

  const name = await page.getByRole('heading', { level: 1 }).textContent();
  const json = await page
    .locator('script[type="application/ld+json"]')
    .first()
    .textContent();
  const data = JSON.parse(json ?? '') as Record<string, unknown>;

  expect(data['@context']).toBe('https://schema.org');
  expect(['Physician', 'Dentist']).toContain(data['@type']);
  expect(data.name).toBe(name?.trim());
  expect(data.url).toMatch(new RegExp(`${profilePath}$`));
});

// The profile is read before anything goes out: a real 404, not a 200 with
// the not-found UI streamed in (AGENTS.md §4).
for (const missing of [
  '00000000-0000-4000-8000-000000000000',
  'not-a-profile',
]) {
  test(`/s/${missing} is a real 404 that says the profile is not available`, async ({
    page,
  }) => {
    const response = await page.goto(`/s/${missing}`);
    expect(response?.status()).toBe(404);

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
