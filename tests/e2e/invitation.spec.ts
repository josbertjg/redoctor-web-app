import { expect, test, type Page } from '@playwright/test';

import { auditAccessibility } from './helpers';
import { buildInvitationResponse } from '../factories/invitations';
import { errorEnvelope } from '../msw/api-url';

/*
 * The invitation link (M4). The page reads the invitation from the
 * patient's browser, so these tests answer the API's call in the browser
 * itself: the same factory the unit tests use, no dependency on api-dev or
 * on its CORS (REDOC-362).
 */

const token = 'tok-e2e-pending-0000001';

async function answerInvitation(page: Page, body: unknown, status = 200) {
  await page.route('**/scheduling/invitations/**', (route) =>
    route.fulfill({
      status,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify(body),
    }),
  );
}

test('a stranger sees the appointment and signs in right there', async ({
  page,
}) => {
  await answerInvitation(page, buildInvitationResponse());
  await page.goto(`/i/${token}?origin=whatsapp-invitation`);

  await expect(
    page.getByRole('heading', { level: 1, name: 'Invitación a una cita' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Dra. María González' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Necesitas una cuenta para reclamarla' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Continuar con Google/ }),
  ).toBeVisible();
  await expect(page.getByText('Clínica Canaima')).toBeVisible();
  await expect(page.getByText('V-12345678')).toHaveCount(0);

  // The channel tag leaves the address bar once counted (AGENTS.md §6).
  await expect(page).toHaveURL(new RegExp(`/i/${token}$`));
  expect(await auditAccessibility(page)).toEqual([]);
});

test('the link is a credential: never indexed, never a referrer, a preview with no data', async ({
  page,
}) => {
  await answerInvitation(page, buildInvitationResponse());
  const response = await page.goto(`/i/${token}`);

  // Even for a crawler that reads no HTML (robots.txt lets it fetch the page).
  expect(response?.headers()['x-robots-tag']).toBe('noindex, nofollow');
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute(
    'content',
    /noindex/,
  );
  // The site's own card: a page that sets its Open Graph keeps the image.
  await expect(
    page.locator('meta[property="og:image"]').first(),
  ).toHaveAttribute('content', /\/opengraph-image/);
  await expect(page.locator('meta[name="referrer"]')).toHaveAttribute(
    'content',
    'no-referrer',
  );
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    'content',
    'Tienes una cita en Redoctor',
  );
  const preview = await page
    .locator('meta[property^="og:"], meta[name^="twitter:"]')
    .evaluateAll((tags) =>
      tags.map((tag) => tag.getAttribute('content') ?? '').join(' '),
    );
  expect(preview).not.toContain(token);
  expect(preview).not.toContain('María');
});

test('a link no invitation has says so', async ({ page }) => {
  await answerInvitation(
    page,
    errorEnvelope('ERR_4001', 'Invitation not found'),
    404,
  );
  await page.goto('/i/tok-e2e-missing-00000001');

  await expect(
    page.getByRole('heading', {
      name: 'Esta invitación no existe o el enlace es incorrecto',
    }),
  ).toBeVisible();
});
