import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    window.__brandCurtainAdded = false;
    new MutationObserver((records) => {
      for (const record of records) for (const node of record.addedNodes) {
        if (node.nodeType === 1 && (node.matches('.site-arrival') || node.querySelector('.site-arrival'))) {
          window.__brandCurtainAdded = true;
        }
      }
    }).observe(document, { childList: true, subtree: true });
  });
});

async function expectNoBrandArrival(page, project = "Raiffeisen") {
  await expect.poll(() => page.evaluate(() => window.PortfolioArrival?.state)).toBe("skipped");
  await expect(page.locator('.site-arrival')).toHaveCount(0);
  await expect(page.locator('html')).not.toHaveClass(/arrival-active/);
  expect(await page.evaluate(() => window.__brandCurtainAdded), 'no transient curtain is inserted').toBe(false);
  await expect(page.locator('h1')).toHaveText(project);
  await expect(page.locator('h1')).toBeVisible();
}

const entries = [
  { path: '/works', selector: '.work-title[href="/work/raiffeisen"]', slug: 'raiffeisen', title: 'Raiffeisen' },
  { path: '/ai-integration', selector: '.ai-related-list a[href="/work/instructure"]', slug: 'instructure', title: 'Instructure' },
  { path: '/hu/ai-integracio', selector: '.ai-related-list a[href="/work/instructure"]', slug: 'instructure', title: 'Instructure' },
  { path: '/about', viaWorks: true, selector: '.work-title[href="/work/raiffeisen"]', slug: 'raiffeisen', title: 'Raiffeisen' },
];

for (const width of [390, 1280]) for (const entry of entries) {
  test(`${width}: fresh ${entry.path} opens its first case without replaying the brand arrival`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(entry.path);
    if (entry.viaWorks) {
      await page.locator('.story-text-link[href="/works"]').first().click();
      await expect(page).toHaveURL(/\/works$/);
    }
    await page.locator(entry.selector).first().click();
    await expect(page).toHaveURL(new RegExp(`/work/${entry.slug}$`));
    await expectNoBrandArrival(page, entry.title);
  });
}

for (const path of ['/', '/work/raiffeisen']) {
  test(`a first direct ${path} visit retains the approved brand introduction`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.site-arrival')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.site-arrival')).toHaveCount(0);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect.poll(() => page.evaluate(() => window.PortfolioArrival?.state)).toBe('skipped');
    expect(await page.evaluate(() => window.__brandCurtainAdded)).toBe(false);
  });
}

test('internal navigation skips the arrival even when the referrer is withheld', async ({ page }) => {
  await page.route('**/works', async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, headers: { ...response.headers(), 'referrer-policy': 'no-referrer' } });
  });
  await page.goto('/works');
  await page.locator('.work-title[href="/work/raiffeisen"]').click();
  expect(await page.evaluate(() => document.referrer)).toBe('');
  await expectNoBrandArrival(page);
});

test('same-site referrer prevents a curtain if the source navigation script failed', async ({ page }) => {
  await page.route('**/assets/js/navigation.js', (route) => route.abort());
  await page.goto('/works');
  await page.locator('.work-title[href="/work/raiffeisen"]').click();
  expect(await page.evaluate(() => document.referrer)).toMatch(/\/works$/);
  await expectNoBrandArrival(page);
});

test('case links, reload and back keep the visit and restore the project list position', async ({ page }) => {
  await page.goto('/works');
  const entry = page.locator('.work-title[href="/work/raiffeisen"]');
  await entry.scrollIntoViewIfNeeded();
  const listPosition = await page.evaluate(() => scrollY);
  await entry.click();
  await expectNoBrandArrival(page);
  await page.reload();
  await expectNoBrandArrival(page);
  await page.goBack();
  await expect(page).toHaveURL(/\/works$/);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(listPosition, 0);
  await page.goForward();
  await expectNoBrandArrival(page);
  await page.getByRole('link', { name: 'Bitpanda', exact: true }).first().click();
  await expect(page).toHaveURL(/\/work\/bitpanda$/);
  await expectNoBrandArrival(page, 'Bitpanda');
});

test('unavailable session storage leaves direct and internal cases readable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'sessionStorage', { get() { throw new DOMException('Blocked for test', 'SecurityError'); } });
  });
  await page.goto('/work/raiffeisen');
  await expectNoBrandArrival(page);
  await page.getByRole('link', { name: 'Works', exact: true }).first().click();
  await page.locator('.work-title[href="/work/instructure"]').click();
  await expectNoBrandArrival(page, 'Instructure');
});

test('reduced motion never starts the curtain during an internal case visit', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/works');
  await page.locator('.work-title[href="/work/raiffeisen"]').click();
  await expectNoBrandArrival(page);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('portfolio rows still open the correct readable case', async ({ page }) => {
    await page.goto('/works');
    await page.locator('.work-title[href="/work/raiffeisen"]').click();
    await expect(page).toHaveURL(/\/work\/raiffeisen$/);
    await expect(page.locator('h1')).toHaveText('Raiffeisen');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('.site-arrival')).toHaveCount(0);
  });
});
