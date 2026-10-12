import { expect, test } from '@playwright/test';

import { auditAccessibility } from './helpers';
import { appointmentIds } from '../factories/appointments';

/*
 * The appointment link (M5). An appointment belongs to an account: without
 * a session the page asks for one and never calls the API, so these tests
 * need neither api-dev nor its CORS (REDOC-362). Signed in, the page is
 * covered by the component tests (MSW).
 */

const id = appointmentIds.upcoming;

test('a stranger is asked to sign in, and nothing of the appointment is read', async ({
  page,
}) => {
  let read = false;
  await page.route('**/scheduling/appointments/**', (route) => {
    read = true;
    return route.abort();
  });
  await page.goto(`/a/${id}?origin=email-12`);

  await expect(
    page.getByRole('heading', { level: 1, name: 'Detalles de la cita' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Entra para ver tu cita' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Continuar con Google/ }),
  ).toBeVisible();

  // The channel tag leaves the address bar once counted (AGENTS.md §6).
  await expect(page).toHaveURL(new RegExp(`/a/${id}$`));
  expect(read).toBe(false);
  expect(await auditAccessibility(page)).toEqual([]);
});

test('never indexed, and a preview with nothing of the appointment', async ({
  page,
}) => {
  await page.goto(`/a/${id}`);

  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute(
    'content',
    /noindex/,
  );
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    'content',
    'Tu cita en Redoctor',
  );
  const preview = await page
    .locator('meta[property^="og:"], meta[name^="twitter:"]')
    .evaluateAll((tags) =>
      tags.map((tag) => tag.getAttribute('content') ?? '').join(' '),
    );
  expect(preview).not.toContain(id);
});
