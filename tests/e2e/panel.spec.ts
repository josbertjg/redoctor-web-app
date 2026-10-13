import { expect, test } from '@playwright/test';

/*
 * The specialist's panel (M14): every section is the specialist's own, so
 * a stranger is sent to sign in and brought back to the same address — the
 * daily summary's day included. Signed in, the sections are covered by the
 * component tests (MSW). A browser whose session was a specialist's never
 * sees the landing: the server sends it to the panel.
 */

const sections = [
  '/panel',
  '/panel/agenda',
  '/panel/agenda/2026-10-14',
  '/panel/appointments',
  '/panel/reports',
  '/panel/subscription',
];

for (const path of sections) {
  test(`${path} asks a stranger to sign in and keeps the way back`, async ({
    page,
  }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);

    await expect(page).toHaveURL(
      new RegExp(`/sign-in\\?redirect=${encodeURIComponent(path)}$`),
    );
  });
}

test('the panel is never indexed', async ({ request }) => {
  for (const path of sections) {
    const response = await request.get(path);
    expect(await response.text()).toMatch(
      /<meta name="robots" content="noindex/,
    );
  }
});

test('a specialist’s browser goes to the panel, never to the landing', async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([
    { name: 'redoctor-panel', value: '1', url: baseURL ?? 'http://localhost' },
  ]);

  const response = await page.request.get('/', { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(
    new URL(response.headers().location ?? '', 'http://localhost').pathname,
  ).toBe('/panel');
});
