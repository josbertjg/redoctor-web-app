import AxeBuilder from '@axe-core/playwright';

import type { Page } from '@playwright/test';

/**
 * Waits until every finite animation has finished. Content fades in
 * (AGENTS.md §8.2): auditing contrast mid-fade would measure half-transparent
 * text. Infinite ones (skeleton pulse, spinners) are ignored.
 */
export async function waitForAnimations(page: Page): Promise<void> {
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => {
      const iterations = animation.effect?.getTiming().iterations;
      return iterations === Infinity || animation.playState === 'finished';
    }),
  );
}

/**
 * Waits for the page's own content. Every page is dynamic (the CSP nonce),
 * so Next streams it behind the root `loading.tsx` and React reveals it a
 * few hundred ms after `load`: until then the skeleton is what shows and
 * the content sits in a hidden container. Every page of ours renders a
 * `main` landmark, so its visibility is the signal (attached is not: the
 * hidden container is in the DOM from the start).
 */
export async function waitForContent(page: Page): Promise<void> {
  await page.locator('main').first().waitFor({ state: 'visible' });
}

/**
 * Scrolls through the whole page and back, so everything that reveals on
 * scroll has entered before anything is measured. axe scrolls elements into
 * view by itself, which would start those entrances mid-audit.
 */
export async function revealWholePage(page: Page): Promise<void> {
  await waitForContent(page);
  const height = await page.evaluate(() => document.body.scrollHeight);
  const step = await page.evaluate(() => window.innerHeight / 2);
  for (let top = 0; top < height; top += step) {
    await page.evaluate((y) => {
      window.scrollTo(0, y);
    }, top);
    await page.waitForTimeout(50);
  }
  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
  await waitForAnimations(page);
}

/** axe on the settled page. */
export async function auditAccessibility(page: Page) {
  await revealWholePage(page);
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations;
}
