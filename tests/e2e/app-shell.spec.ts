import { expect, test } from '@playwright/test';

import { auditAccessibility, e2eSpecialistId, waitForContent } from './helpers';

/*
 * The shell every page stands on: security headers, the per-request CSP
 * nonce reaching Next's scripts, the 404 and the metadata files.
 */

test('the home page is served with a nonce CSP and the security headers', async ({
  page,
}) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);

  const headers = response?.headers() ?? {};
  const policy = headers['content-security-policy'] ?? '';
  const nonce = /'nonce-([^']+)'/.exec(policy)?.[1];

  expect(nonce).toBeTruthy();
  expect(policy).toContain("frame-ancestors 'none'");
  expect(headers['strict-transport-security']).toContain('max-age=');
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(headers['permissions-policy']).toContain('camera=()');
  expect(headers['x-powered-by']).toBeUndefined();

  // Every script Next.js renders carries this response's nonce. (Chunks the
  // page loads later, such as Motion's features and the splash's runtime,
  // run under 'strict-dynamic': a nonced script asked for them.)
  const scriptTags = (await response?.text())?.match(/<script\b[^>]*>/g) ?? [];
  expect(scriptTags.length).toBeGreaterThan(0);
  for (const tag of scriptTags) expect(tag).toContain(`nonce="${nonce}"`);

  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('each response gets a fresh nonce', async ({ request }) => {
  const nonceOf = async () => {
    const response = await request.get('/');
    return /'nonce-([^']+)'/.exec(
      response.headers()['content-security-policy'] ?? '',
    )?.[1];
  };

  expect(await nonceOf()).not.toBe(await nonceOf());
});

test('the public pages run under the CSP without a single violation', async ({
  page,
}) => {
  // A blocked attempt is reported even when the code catches it: zod's
  // eval check did so on every page until it was told not to try
  // (instrumentation-client.ts).
  await page.addInitScript(() => {
    const seen: string[] = [];
    Object.defineProperty(window, '__cspViolations', { value: seen });
    document.addEventListener('securitypolicyviolation', (event) => {
      seen.push(`${event.violatedDirective} ${event.blockedURI}`);
    });
  });

  for (const path of [
    '/',
    '/sign-in',
    '/search?q=medicina',
    `/s/${e2eSpecialistId}`,
    '/terms',
  ]) {
    await page.goto(path);
    await waitForContent(page);
    await page.waitForLoadState('networkidle');
    const violations = await page.evaluate(
      () =>
        (window as unknown as { __cspViolations: string[] }).__cspViolations,
    );
    expect(violations, path).toEqual([]);
  }
});

test('a phone in dark mode still gets the light theme', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');

  const background = await page
    .locator('body')
    .evaluate((body) => getComputedStyle(body).backgroundColor);
  // white-50 (#FDFDFD): the dark aliases are defined but not wired.
  expect(background).toBe('rgb(253, 253, 253)');
});

test('the home page has no accessibility violations', async ({ page }) => {
  await page.goto('/');
  expect(await auditAccessibility(page)).toEqual([]);
});

test('an unknown URL answers 404 with a way home', async ({ page }) => {
  const response = await page.goto('/esta-ruta-no-existe');
  expect(response?.status()).toBe(404);

  await expect(
    page.getByRole('heading', { level: 1, name: 'Esta página no existe' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Ir al inicio', exact: true }),
  ).toHaveAttribute('href', '/');

  expect(await auditAccessibility(page)).toEqual([]);
});

test('robots, sitemap and manifest are served', async ({ request }) => {
  const robots = await request.get('/robots.txt');
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain('User-Agent: *');

  // The sitemap lists the public pages and every public profile the API
  // lists (api-dev's test profile among them).
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  for (const path of ['/', '/terms', '/privacy', '/delete-account']) {
    expect(xml).toContain(`${path}</loc>`);
  }
  expect(xml).toContain(`/s/${e2eSpecialistId}</loc>`);

  const manifest = await request.get('/manifest.webmanifest');
  expect(manifest.status()).toBe(200);
  expect(((await manifest.json()) as { name: string }).name).toBe('Redoctor');
});
