import { expect, test } from '@playwright/test';

import { auditAccessibility } from './helpers';

/*
 * Booking from a profile (M15) against the real API (api-dev): the page
 * renders the specialist on the server and asks for the session right
 * there. The steps need a session and the API's CORS (REDOC-362): the
 * component tests (MSW) cover them. The specialist is api-dev's test
 * profile; override it with E2E_SPECIALIST_ID when it changes.
 */
const specialistId =
  process.env.E2E_SPECIALIST_ID ?? 'a0af9566-a53d-4887-8d16-1dfc589c2f3d';

test('the booking asks a visitor to sign in, and is never indexed', async ({
  page,
}) => {
  const response = await page.goto(`/book/${specialistId}`);
  expect(response?.status()).toBe(200);
  expect(response?.headers()['x-robots-tag']).toBe('noindex, nofollow');
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute(
    'content',
    /noindex/,
  );

  await expect(
    page.getByRole('heading', { level: 1, name: 'Agendar cita' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Entra para agendar tu cita' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Perfil del especialista' }),
  ).toHaveAttribute('href', `/s/${specialistId}`);

  expect(await auditAccessibility(page)).toEqual([]);
});

for (const missing of [
  '00000000-0000-4000-8000-000000000000',
  'not-a-profile',
]) {
  test(`/book/${missing} is a real 404 that says the profile is not there`, async ({
    page,
  }) => {
    const response = await page.goto(`/book/${missing}`);
    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Este perfil no está disponible',
      }),
    ).toBeVisible();
  });
}
