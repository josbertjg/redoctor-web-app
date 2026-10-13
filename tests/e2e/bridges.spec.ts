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

// The subscription and the agenda are the panel's own pages since
// 2026-10-13 (panel.spec.ts); these two still only open the app.
const bridges = [
  {
    path: '/panel/specialties',
    heading: 'Tus especialidades se abren en la app de Redoctor',
  },
  {
    path: '/panel/profile',
    heading: 'Tu perfil se abre en la app de Redoctor',
  },
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
  await page.goto('/panel/specialties?origin=email-16');

  await expectOpensInApp(page, '/panel/specialties');
});

test('a bridge has no accessibility violations', async ({ page }) => {
  await page.goto('/panel/specialties');
  await page.getByRole('link', { name: 'Abrir en la app' }).waitFor();

  expect(await auditAccessibility(page)).toEqual([]);
});

// A renamed path (AGENTS.md §6) answers for good with a permanent redirect
// that keeps the query: a link already sent never breaks.
const renamed = [
  ['/suscripcion', '/panel/subscription'],
  ['/agenda', '/panel/agenda'],
  ['/agenda/2026-10-01', '/panel/agenda/2026-10-01'],
  ['/especialidades', '/panel/specialties'],
  ['/perfil?origin=email-18', '/panel/profile?origin=email-18'],
  [
    '/resumen/baja?token=forged-in-e2e',
    '/daily-summary/unsubscribe?token=forged-in-e2e',
  ],
  ['/citas/invitacion/forged-in-e2e', '/i/forged-in-e2e'],
] as const;

for (const [from, to] of renamed) {
  test(`${from} redirects for good to ${to}`, async ({ request }) => {
    const response = await request.get(from, { maxRedirects: 0 });

    expect(response.status()).toBe(308);
    const location = new URL(
      response.headers().location ?? '',
      'http://localhost',
    );
    expect(`${location.pathname}${location.search}`).toBe(to);
  });
}

// No loading state streams the panel (there is no root loading.tsx, nor one
// in the panel), so a notFound() in the agenda answers a real 404, with the
// not-found page, noindex (node_modules/next/dist/docs, not-found.md).
test('an agenda path the app does not know shows the not-found page', async ({
  page,
}) => {
  const response = await page.goto('/panel/agenda/2026-10-01/extra');

  expect(response?.status()).toBe(404);
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
    await page.goto('/daily-summary/unsubscribe');

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
    await page.goto('/daily-summary/unsubscribe?token=forged-in-e2e');
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
