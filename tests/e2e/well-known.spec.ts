import { readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

/*
 * The two files that make redoctorapp.com links open the mobile app. They are
 * a contract with the app (AGENTS.md §6): served with status 200, as JSON,
 * never behind a redirect, byte-exact to what public/.well-known holds.
 */
const files = [
  {
    path: '/.well-known/apple-app-site-association',
    source: 'public/.well-known/apple-app-site-association',
  },
  {
    path: '/.well-known/assetlinks.json',
    source: 'public/.well-known/assetlinks.json',
  },
];

for (const { path, source } of files) {
  test(`${path} is served byte-exact as JSON`, async ({ request }) => {
    const response = await request.get(path, { maxRedirects: 0 });

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toMatch(/^application\/json/);

    const body = await response.text();
    expect(body).toBe(await readFile(source, 'utf8'));
    expect(() => {
      JSON.parse(body);
    }).not.toThrow();

    // proxy.ts never touches these files (its CSP would be the tell).
    expect(response.headers()['content-security-policy']).toBeUndefined();
  });
}
