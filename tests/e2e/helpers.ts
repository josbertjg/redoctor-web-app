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

/** axe on the settled page. */
export async function auditAccessibility(page: Page) {
  await waitForAnimations(page);
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations;
}
