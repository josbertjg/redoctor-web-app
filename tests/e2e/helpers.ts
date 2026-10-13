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
 * Waits for the page's own content. Every page is dynamic (the CSP nonce);
 * a segment with a `loading.tsx` streams behind it, and React reveals the
 * content a few hundred ms after `load`, while it sits in a hidden
 * container. Every page of ours renders a `main` landmark, so its
 * visibility is the signal (attached is not: the hidden container is in the
 * DOM from the start).
 */
export async function waitForContent(page: Page): Promise<void> {
  await page.locator('main').first().waitFor({ state: 'visible' });
  // The landing's splash veil, when a session starts with it: let it leave.
  await page
    .locator('[data-splash]')
    .waitFor({ state: 'detached', timeout: 6_000 })
    .catch(() => undefined);
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
/**
 * Contrast the owner accepted below AA (AGENTS.md §13): the white words on
 * the brand green card of «Sí, puedes confiar» (2.8:1). Everything else on
 * the page must pass.
 */
const acceptedContrast = '#verificacion [data-piece="card-2"]';

export async function auditAccessibility(page: Page) {
  await revealWholePage(page);
  const results = await new AxeBuilder({ page }).analyze();
  const violations = [];
  for (const violation of results.violations) {
    if (violation.id !== 'color-contrast') {
      violations.push(violation);
      continue;
    }
    const selectors = violation.nodes.map((node) =>
      node.target
        .map((part) => (Array.isArray(part) ? part.join(' ') : part))
        .join(' '),
    );
    const accepted = await page.evaluate(
      ([list, within]) =>
        list.map((selector) => {
          const element = document.querySelector(selector);
          return element ? element.closest(within) !== null : false;
        }),
      [selectors, acceptedContrast] as const,
    );
    const nodes = violation.nodes.filter((_, index) => !accepted[index]);
    if (nodes.length > 0) violations.push({ ...violation, nodes });
  }
  return violations;
}
