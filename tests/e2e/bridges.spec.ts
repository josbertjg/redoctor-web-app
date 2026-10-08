import { expect, test, type Page } from '@playwright/test';

import { auditAccessibility } from './helpers';

/*
 * The bridges (M11): pages the app opens when installed. Without it, the web
 * says what opens there and offers «Abrir en la app» with the same path:
 * the app's scheme on iOS, an intent:// with this page as fallback on
 * Android Chrome. They never reach search results.
 */

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function expectOpensInApp(page: Page, path: string) {
  const href = await page
    .getByRole('link', { name: 'Abrir en la app' })
    .getAttribute('href');
  const isAndroid = await page.evaluate(() =>
    navigator.userAgent.includes('Android'),
  );
  const escapedPath = escapeRegExp(path);

  expect(href).toMatch(
    isAndroid
      ? new RegExp(
          `^intent://[^/]+${escapedPath}#Intent;scheme=redoctor;` +
            'package=com\\.redoctor\\.mobileapp;S\\.browser_fallback_url=[^;]+;end$',
        )
      : new RegExp(`^redoctor://[^/]+${escapedPath}$`),
  );
}

const bridges = [
  {
    path: '/suscripcion',
    heading: 'Tu suscripción se abre en la app de Redoctor',
  },
  { path: '/agenda', heading: 'Tu agenda se abre en la app de Redoctor' },
  {
    path: '/agenda/2026-10-01',
    heading: 'Tu agenda se abre en la app de Redoctor',
  },
  {
    path: '/especialidades',
    heading: 'Tus especialidades se abren en la app de Redoctor',
  },
  { path: '/perfil', heading: 'Tu perfil se abre en la app de Redoctor' },
  {
    path: '/home/home/my-subscription',
    heading: 'Esto se abre en la app de Redoctor',
  },
];

for (const bridge of bridges) {
  test(`${bridge.path} offers to open the same path in the app`, async ({
    page,
  }) => {
    const response = await page.goto(bridge.path);
    expect(response?.status()).toBe(200);

    await expect(
      page.getByRole('heading', { level: 1, name: bridge.heading }),
    ).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      /noindex/,
    );
    await expectOpensInApp(page, bridge.path);
  });
}

test('the link to the app never carries the origin tag', async ({ page }) => {
  await page.goto('/suscripcion?origin=email-12');

  await expectOpensInApp(page, '/suscripcion');
});

test('a bridge has no accessibility violations', async ({ page }) => {
  await page.goto('/suscripcion');
  await page.getByRole('link', { name: 'Abrir en la app' }).waitFor();

  expect(await auditAccessibility(page)).toEqual([]);
});

// The root loading state streams every page, so a notFound() that runs in
// the page arrives after the 200 is sent: the not-found page renders and
// Next.js marks it noindex (node_modules/next/dist/docs, not-found.md).
test('an agenda path the app does not know shows the not-found page', async ({
  page,
}) => {
  await page.goto('/agenda/2026-10-01/extra');

  await expect(
    page.getByRole('heading', { level: 1, name: 'Esta página no existe' }),
  ).toBeVisible();
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute(
    'content',
    /noindex/,
  );
});

test.describe('daily-summary opt-out', () => {
  test('without a token it says the link is not valid', async ({ page }) => {
    await page.goto('/resumen/baja');

    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Este enlace ya no es válido',
      }),
    ).toBeVisible();
    await expect(page.locator('meta[name="referrer"]')).toHaveAttribute(
      'content',
      'no-referrer',
    );
  });

  test('a forged token changes nothing and says so (api-dev answers ERR_8004)', async ({
    page,
  }) => {
    await page.goto('/resumen/baja?token=forged-in-e2e');
    await expect(
      page.getByRole('heading', { name: 'Resumen diario de tu agenda' }),
    ).toBeVisible();
    expect(await auditAccessibility(page)).toEqual([]);

    await page.getByRole('button', { name: 'Dejar de recibirlo' }).click();

    await expect(
      page.getByRole('heading', { name: 'Este enlace ya no es válido' }),
    ).toBeVisible();
  });
});
