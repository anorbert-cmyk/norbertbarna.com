import { test, expect } from '@playwright/test';

const slugs = ['raiffeisen', 'instructure', 'bitpanda', 'benker', 'sportsgambit', 'kineticare', 'onrobot'];
// Every content page in both languages, including the contact form pair (owner, 2026-10-06).
const paths = ['/', '/works', '/about', '/ai-integration', '/privacy', '/contact', ...slugs.map(slug => `/work/${slug}`),
  '/hu', '/hu/munkak', '/hu/rolam', '/hu/ai-integracio', '/hu/adatvedelem', '/hu/kapcsolat', ...slugs.map(slug => `/hu/munka/${slug}`)];
const privacyContact = { '/privacy': ['/contact', 'Contact form'], '/hu/adatvedelem': ['/hu/kapcsolat', 'Kapcsolatfelvételi űrlap'] };

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
    if (privacyContact[path]) {
      // Data-rights requests go through the contact form link, never a mail button.
      const [href, label] = privacyContact[path];
      const contact = page.locator('main a.footer-email');
      await expect(contact).toHaveCount(1);
      await expect(contact).toHaveAttribute('href', href);
      await expect(contact).toHaveText(label);
      await expect(page.locator('button.footer-email')).toHaveCount(0);
      const target = await contact.boundingBox();
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
