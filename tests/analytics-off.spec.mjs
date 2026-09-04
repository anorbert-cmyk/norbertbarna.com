import { test, expect } from '@playwright/test';

const paths = ['/', '/works', '/ai-integration', '/hu/ai-integracio', '/privacy', '/hu/adatvedelem',
  '/work/raiffeisen', '/work/instructure', '/work/bitpanda', '/work/benker', '/work/sportsgambit', '/work/kineticare', '/work/onrobot'];

async function observeOff(page) {
  const vendor = [];
  await page.route(/posthog\.com/, async route => {
    vendor.push(route.request().url());
    await route.abort();
  });
  await page.addInitScript(() => {
    // A valid historical grant must not bypass the release gate.
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
  test(`production OFF remains inert with historical consent: ${path}`, async ({ page }) => {
    const vendor = await observeOff(page);
    const response = await page.goto(path + '?analytics_test=1');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-security-policy']).not.toContain('posthog.com');
    expect(await page.evaluate(() => window.PortfolioAnalyticsConfig.enabled)).toBe(false);
    await assertOff(page, vendor);
    // Hidden settings must stay out of sequential keyboard navigation.
    const settings = await page.locator('[data-consent-settings]').evaluate(element => ({
      hidden: element.hidden, rects: element.getClientRects().length,
    }));
    expect(settings).toEqual({ hidden: true, rects: 0 });
    if (path === '/privacy' || path === '/hu/adatvedelem') {
      const target = await page.locator('main button.footer-email').boundingBox();
      expect(target.height).toBeGreaterThanOrEqual(44);
      expect(target.width).toBeGreaterThanOrEqual(44);
    }
  });
}

for (const [name, body] of [
  ['missing', ''], ['malformed', 'window.PortfolioAnalyticsConfig = null;'],
  ['truthy string', 'window.PortfolioAnalyticsConfig = { enabled: "true" };'],
  ['syntax error', 'window.PortfolioAnalyticsConfig = {'],
]) {
  test(`configuration ${name} fails closed`, async ({ page }) => {
    const vendor = await observeOff(page);
    await page.route('**/assets/js/analytics-config.js', route => route.fulfill({ contentType: 'application/javascript', body }));
    await page.goto('/hu/ai-integracio');
    await assertOff(page, vendor);
  });
}
