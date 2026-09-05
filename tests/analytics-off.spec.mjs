import { test, expect } from '@playwright/test';

const paths = ['/', '/works', '/ai-integration', '/hu/ai-integracio', '/privacy', '/hu/adatvedelem',
  '/work/raiffeisen', '/work/instructure', '/work/bitpanda', '/work/benker', '/work/sportsgambit', '/work/kineticare', '/work/onrobot'];

async function interceptVendor(page) {
  const vendor = [];
  await page.route(/posthog\.com/, async route => {
    vendor.push(route.request().url());
    await route.fulfill({ status: 200, body: '{"status":1}', headers: { 'access-control-allow-origin': '*' } });
  });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'userAgent', { get: () => 'Mozilla/5.0 Chrome/140.0.0.0 Safari/537.36' });
  });
  return vendor;
}

async function observeBrokenConfig(page) {
  const vendor = [];
  await page.route(/posthog\.com/, async route => {
    vendor.push(route.request().url());
    await route.abort();
  });
  await page.addInitScript(() => {
    localStorage.setItem('bn-analytics-consent-v1', JSON.stringify({ version: 1, decision: 'accepted', timestamp: Date.now(), generation: crypto.randomUUID() }));
    window.analyticsStorageAccess = [];
    for (const name of ['getItem', 'setItem', 'removeItem']) {
      const original = Storage.prototype[name];
      Storage.prototype[name] = function (key, ...args) {
        if (String(key).startsWith('bn-analytics-')) window.analyticsStorageAccess.push([name, key]);
        return original.call(this, key, ...args);
      };
    }
    Object.defineProperty(navigator, 'userAgent', { get: () => 'Mozilla/5.0 Chrome/140.0.0.0 Safari/537.36' });
  });
  return vendor;
}

async function assertOff(page, vendor) {
  await expect(page.locator('[data-consent-settings]')).toBeHidden();
  expect(await page.evaluate(() => ({
    consent: typeof window.PortfolioConsent,
    analytics: typeof window.PortfolioAnalyticsReady,
    accesses: window.analyticsStorageAccess,
    sessions: Object.keys(sessionStorage).filter(key => key.startsWith('bn-analytics-')),
  }))).toEqual({ consent: 'undefined', analytics: 'undefined', accesses: [], sessions: [] });
  expect(vendor).toEqual([]);
}

for (const path of paths) {
  test(`production ON stays silent until consent: ${path}`, async ({ page }) => {
    const vendor = await interceptVendor(page);
    const response = await page.goto(path);
    expect(response.status()).toBe(200);
    const csp = response.headers()['content-security-policy'];
    expect(csp).toContain('https://eu.i.posthog.com');
    expect(csp).not.toContain('eu-assets');
    expect(await page.evaluate(() => window.PortfolioAnalyticsConfig.enabled)).toBe(true);
    await expect(page.locator('[data-consent-banner]')).toBeVisible();
    await expect(page.locator('[data-consent-settings]')).toBeVisible();
    expect(vendor).toEqual([]);
    if (path === '/privacy' || path === '/hu/adatvedelem') {
      const target = await page.locator('main button.footer-email').boundingBox();
      expect(target.height).toBeGreaterThanOrEqual(44);
      expect(target.width).toBeGreaterThanOrEqual(44);
    }
  });
}

test('historical accepted consent starts measurement without a new prompt', async ({ page }) => {
  const vendor = await interceptVendor(page);
  await page.addInitScript(() => {
    localStorage.setItem('bn-analytics-consent-v1', JSON.stringify({
      version: 1, decision: 'accepted', timestamp: Date.now(), generation: crypto.randomUUID(),
    }));
  });
  await page.goto('/ai-integration');
  await expect.poll(() => vendor.length).toBe(1);
  expect(vendor[0]).toContain('eu.i.posthog.com');
  await expect(page.locator('[data-consent-banner]')).toBeHidden();
  await expect(page.locator('[data-consent-settings]')).toBeVisible();
});

test('Hungarian first visit can allow analytics from the banner', async ({ page }) => {
  const vendor = await interceptVendor(page);
  await page.goto('/hu/adatvedelem');
  expect(vendor).toEqual([]);
  await page.getByRole('button', { name: 'Mérés engedélyezése', exact: true }).click();
  await expect.poll(() => vendor.length).toBe(1);
  await expect(page.locator('[data-consent-banner]')).toBeHidden();
});

for (const [name, body] of [
  ['missing', ''], ['malformed', 'window.PortfolioAnalyticsConfig = null;'],
  ['truthy string', 'window.PortfolioAnalyticsConfig = { enabled: "true" };'],
  ['syntax error', 'window.PortfolioAnalyticsConfig = {'],
]) {
  test(`configuration ${name} fails closed`, async ({ page }) => {
    const vendor = await observeBrokenConfig(page);
    await page.route('**/assets/js/analytics-config.js', route => route.fulfill({ contentType: 'application/javascript', body }));
    await page.goto('/hu/ai-integracio');
    await assertOff(page, vendor);
  });
}
