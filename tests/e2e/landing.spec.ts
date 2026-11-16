import { expect, test, type Locator, type Page } from '@playwright/test';

import { waitForAnimations, waitForContent } from './helpers';
import manifest from '../../package.json';

/*
 * The landing's welcome: the splash veil on a session's first visit, and
 * the promise that stays readable for assistive technology while its
 * letters animate.
 */

test('the splash greets the first visit of a session and not the next', async ({
  page,
}) => {
  await page.goto('/');
  const veil = page.locator('[data-splash]');
  await expect(veil).toBeAttached();
  // The logo's runtime, served from this origin, draws under the CSP.
  await expect(veil.locator('canvas')).toBeAttached({ timeout: 5_000 });

  await waitForContent(page);
  await expect(veil).toHaveCount(0);
  const cookies = await page.context().cookies();
  expect(cookies.some((cookie) => cookie.name === 'redoctor-splash')).toBe(
    true,
  );

  await page.reload();
  await waitForContent(page);
  await expect(page.locator('[data-splash]')).toHaveCount(0);
});

test('the promise keeps its words while the letters enter', async ({
  page,
}) => {
  await page.goto('/');
  await waitForContent(page);

  await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName(
    /Confianza, salud y gestión eficiente,\s*en un solo click\./,
  );
});

/**
 * Scrolls past the hero's box, which docks the bar with a search of its
 * own, and hands back that search and its box for what is looked for.
 */
async function dockTheBar(page: Page) {
  await page.goto('/');
  await waitForContent(page);
  await page.evaluate(() => {
    window.scrollTo(0, 1200);
  });
  const header = page.locator('header').first();
  await expect(header).toHaveAttribute('data-docked');
  // Measured once the bar has settled: while its search's room still grows,
  // the pill fills it from the mark whatever its final place.
  await waitForAnimations(page);
  const search = page.getByRole('search', {
    name: 'Buscar especialistas desde la barra',
  });
  const what = search.getByRole('combobox', {
    name: 'Especialidad o nombre del especialista',
  });
  return { header, search, what };
}

/** Where a person's tap or click lands: on the option as drawn, nothing scrolled first. */
async function centreOf(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('Nothing drawn there');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

test('the docked bar’s search offers its list where a tap reaches it, as wide as the bar', async ({
  page,
}) => {
  const { header, what } = await dockTheBar(page);

  await what.click();
  const list = page.getByRole('listbox', { name: 'Sugerencias' });
  await expect(list).toBeVisible();
  // On a phone the list hangs from the whole bar, not from its narrow field.
  const [listBox, barBox] = await Promise.all([
    list.boundingBox(),
    header.boundingBox(),
  ]);
  expect(listBox?.width ?? 0).toBeGreaterThan((barBox?.width ?? 0) * 0.85);

  const spot = await centreOf(list.getByRole('option').first());
  await page.touchscreen.tap(spot.x, spot.y);
  await expect(page).toHaveURL(/\/search\?specialty=[0-9a-f-]{36}/);
});

test.describe('on a computer', () => {
  test.use({
    viewport: { width: 1728, height: 1000 },
    isMobile: false,
    hasTouch: false,
  });

  test('the docked bar’s search sits beside the mark and its list hangs under its field', async ({
    page,
  }) => {
    const { header, search, what } = await dockTheBar(page);

    // The pill right after the «Re» mark (the bar's gap), however wide the
    // screen: the search landmark is the pill itself.
    const mark = header.getByRole('link', { name: 'Redoctor, ir al inicio' });
    const [markBox, barPillBox] = await Promise.all([
      mark.boundingBox(),
      search.boundingBox(),
    ]);
    expect(
      Math.round(
        (barPillBox?.x ?? 0) - ((markBox?.x ?? 0) + (markBox?.width ?? 0)),
      ),
    ).toBeLessThanOrEqual(16);

    await what.click();
    const list = page.getByRole('listbox', { name: 'Sugerencias' });
    await expect(list).toBeVisible();
    // Under its own field, as in the hero: not across the whole pill.
    const [listBox, pillBox] = await Promise.all([
      list.boundingBox(),
      search.boundingBox(),
    ]);
    expect(listBox?.width ?? 0).toBeLessThan((pillBox?.width ?? 0) * 0.6);
    const spot = await centreOf(list.getByRole('option').first());
    await page.mouse.click(spot.x, spot.y);
    await expect(page).toHaveURL(/\/search\?specialty=[0-9a-f-]{36}/);
  });
});

test('the footer tells which version of the web is live', async ({ page }) => {
  await page.goto('/');
  await waitForContent(page);

  await expect(
    page.getByRole('contentinfo').getByText(`Versión: ${manifest.version}`),
  ).toBeVisible();
});
