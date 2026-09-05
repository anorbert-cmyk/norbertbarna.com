import { test, expect } from '@playwright/test';

const endpoint = 'https://eu.i.posthog.com/i/v0/e/';
// Fixture matches the shipped ON release; capture still waits for consent.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.PortfolioAnalyticsConfig = Object.freeze({ enabled: true });
  });
});
async function setup(page, { accepted = false, path = '/ai-integration', referrer = '', storageFailure = false } = {}) {
  const requests = [];
  await page.route('https://eu.i.posthog.com/**', async route => {
    requests.push(JSON.parse(route.request().postData()));
    await route.fulfill({ status: 200, body: '{"status":1}', headers: { 'access-control-allow-origin': '*' } });
  });
  await page.addInitScript(({ accepted, storageFailure, referrer }) => {
    Object.defineProperty(navigator, 'userAgent', { get: () => 'Mozilla/5.0 Chrome/140.0.0.0 Safari/537.36' });
    let decision = accepted;
    let revision = crypto.randomUUID();
    window.PortfolioConsent = { hasConsent: () => decision, getRevision: () => decision ? revision : null };
    window.changeConsent = value => {
      decision = value;
      if (value) revision = crypto.randomUUID();
      document.dispatchEvent(new CustomEvent('portfolio:consent-change', { detail: { accepted: value } }));
    };
    if (referrer) Object.defineProperty(document, 'referrer', { get: () => referrer });
    if (storageFailure) Object.defineProperty(window, 'sessionStorage', { get: () => { throw Error('blocked'); } });
  }, { accepted, storageFailure, referrer });
  // A local fixture exercises the real transport, without loading the consent UI.
  await page.route('http://127.0.0.1:3000/**', route => {
    if (route.request().resourceType() !== 'document') return route.continue();
    return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><body><header><button class="footer-email">Email</button></header><main><button class="footer-email">Email</button></main><script src="/assets/js/analytics.js"></script></body></html>' });
  });
  await page.goto(path);
  await page.waitForFunction(() => window.PortfolioAnalyticsReady === true);
  return requests;
}

test('no request before consent, after reject, or after revoke; one pageview', async ({ page }) => {
  const sent = await setup(page);
  await page.locator('main button').click();
  expect(sent).toHaveLength(0);
  await page.evaluate(() => window.changeConsent(true));
  await expect.poll(() => sent.length).toBe(1);
  await page.evaluate(() => window.changeConsent(true));
  await page.locator('main button').click();
  await expect.poll(() => sent.length).toBe(2);
  expect(sent.map(e => e.event)).toEqual(['$pageview', 'contact_intent']);
  await page.evaluate(() => window.changeConsent(false));
  await page.locator('main button').click();
  await page.waitForTimeout(100);
  expect(sent).toHaveLength(2);
  expect(await page.evaluate(() => sessionStorage.getItem('bn-analytics-session-v1'))).toBeNull();
});

test('strict payload strips queries, fragments, arbitrary campaigns, referrer paths and DOM', async ({ page }) => {
  const sent = await setup(page, { accepted: true, path: '/ai-integration?email=private@example.test&utm_source=chatgpt.com&utm_medium=organic&utm_campaign=secret#private', referrer: 'https://chatgpt.com/c/private-secret' });
  await expect.poll(() => sent.length).toBe(1);
  const payload = sent[0];
  expect(JSON.stringify(payload)).not.toMatch(/private|secret|email=|utm_campaign/);
  expect(payload.properties.$current_url).toBe('https://www.barnanorbert.com/ai-integration');
  expect(payload.properties.acquisition_source).toBe('chatgpt');
  expect(payload.properties.acquisition_channel).toBe('ai_referral');
  expect(payload.properties.$process_person_profile).toBe(false);
  expect(payload.properties.is_test).toBe(true);
  expect(payload.properties.$session_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  expect(payload.distinct_id).toBe(payload.properties.$session_id);
  expect(payload.properties.$geoip_disable).toBe(true);
  expect(Object.keys(payload.properties).sort()).toEqual(['$current_url', '$device_type', '$geoip_disable', '$host', '$pathname', '$process_person_profile', '$session_id', 'acquisition_channel', 'acquisition_source', 'consent_version', 'is_test', 'page_language', 'page_type', 'site_release'].sort());
});

test('unknown routes and broken storage fail closed without disabling native buttons', async ({ page }) => {
  const sent = await setup(page, { accepted: true, storageFailure: true });
  await page.evaluate(() => document.querySelector('main button').addEventListener('click', () => { window.nativeActivated = true; }));
  await page.locator('main button').click();
  expect(await page.evaluate(() => window.nativeActivated)).toBe(true);
  expect(sent).toHaveLength(0);
});

test('unknown path is never sent', async ({ page }) => {
  const sent = await setup(page, { accepted: true, path: '/private/customer@example.test' });
  await page.locator('main button').click();
  expect(sent).toHaveLength(0);
});

test('revoke aborts in-flight request and never retries after server failure', async ({ page }) => {
  await setup(page);
  await page.evaluate(() => {
    window.transports = [];
    window.fetch = (_url, options) => {
      window.transports.push({ signal: options.signal, keepalive: options.keepalive, credentials: options.credentials, referrerPolicy: options.referrerPolicy });
      return new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))));
    };
    window.changeConsent(true);
    window.changeConsent(false);
  });
  expect(await page.evaluate(() => window.transports.map(t => ({ aborted: t.signal.aborted, keepalive: t.keepalive, credentials: t.credentials, referrerPolicy: t.referrerPolicy })))).toEqual([{ aborted: true, keepalive: false, credentials: 'omit', referrerPolicy: 'no-referrer' }]);
  await page.waitForTimeout(3500);
  expect(await page.evaluate(() => window.transports.length)).toBe(1);
});

test('500 responses are dropped, not queued for retries or navigation', async ({ page }) => {
  await setup(page);
  await page.evaluate(() => {
    window.transportCount = 0;
    window.fetch = async () => { window.transportCount++; return { ok: false, status: 500 }; };
    window.changeConsent(true);
  });
  await page.waitForTimeout(3500);
  await page.evaluate(() => { window.changeConsent(false); window.dispatchEvent(new Event('online')); window.dispatchEvent(new Event('pagehide')); });
  expect(await page.evaluate(() => window.transportCount)).toBe(1);
});

test('session persists only in the tab; 30 minute inactivity rotates UUIDv7', async ({ page }) => {
  const sent = await setup(page, { accepted: true });
  await expect.poll(() => sent.length).toBe(1);
  const id = sent[0].distinct_id;
  await page.clock.setFixedTime(new Date(Date.now() + 31 * 60 * 1000));
  await page.locator('main button').click();
  await expect.poll(() => sent.length).toBe(2);
  expect(sent[1].distinct_id).not.toBe(id);
});

test('revoked identifier cannot return after failed removal and regrant', async ({ page }) => {
  const sent = await setup(page, { accepted: true });
  await expect.poll(() => sent.length).toBe(1);
  const oldId = sent[0].distinct_id;
  await page.evaluate(() => {
    const remove = Storage.prototype.removeItem;
    Storage.prototype.removeItem = function (key) { if (key === 'bn-analytics-session-v1') throw Error('blocked'); return remove.call(this, key); };
    window.changeConsent(false);
    window.changeConsent(true);
  });
  await page.locator('main button').click();
  await expect.poll(() => sent.length).toBe(2);
  expect(sent[1].distinct_id).not.toBe(oldId);
  expect(sent.map(e => e.event)).toEqual(['$pageview', 'contact_intent']);
});

test('a stale session from a previous consent revision is not reused', async ({ page }) => {
  const sent = await setup(page, { accepted: true });
  await expect.poll(() => sent.length).toBe(1);
  const oldId = sent[0].distinct_id;
  await page.evaluate(() => {
    const s = JSON.parse(sessionStorage.getItem('bn-analytics-session-v1'));
    s.consentRevision = crypto.randomUUID();
    sessionStorage.setItem('bn-analytics-session-v1', JSON.stringify(s));
  });
  await page.locator('main button').click();
  await expect.poll(() => sent.length).toBe(2);
  expect(sent[1].distinct_id).not.toBe(oldId);
});

test('real consent generation prevents reuse after same-time regrant, failed deletion and immediate navigation', async ({ page }) => {
  const sent = [];
  const fixed = Date.now();
  await page.clock.setFixedTime(fixed);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'userAgent', { get: () => 'Mozilla/5.0 Chrome/140.0.0.0 Safari/537.36' });
    const remove = Storage.prototype.removeItem;
    Storage.prototype.removeItem = function (key) {
      if (key === 'bn-analytics-session-v1') throw Error('blocked');
      return remove.call(this, key);
    };
    // Capture at fetch invocation, avoiding an in-flight request/navigation race in the assertion.
    // No actual analytics request is made, including after a document change.
    window.fetch = async (url, options) => {
      if (url !== 'https://eu.i.posthog.com/i/v0/e/') throw Error('unexpected transport');
      await window.observeAnalytics(JSON.parse(options.body));
      return { ok: true, status: 200 };
    };
  });
  await page.exposeFunction('observeAnalytics', payload => { sent.push(payload); });
  await page.route('http://127.0.0.1:3000/**', route => {
    if (route.request().resourceType() !== 'document') return route.continue();
    return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><body><main>Consent integration fixture</main><script defer src="/assets/js/consent.js"></script><script defer src="/assets/js/analytics.js"></script></body></html>' });
  });
  await page.goto('/ai-integration');
  await page.waitForFunction(() => window.PortfolioAnalyticsReady === true);
  await page.evaluate(() => window.PortfolioConsent.setDecision('accepted'));
  await expect.poll(() => sent.length).toBe(1);
  const oldId = sent[0].distinct_id;
  const original = await page.evaluate(() => JSON.parse(localStorage.getItem('bn-analytics-consent-v1')));
  await page.evaluate(() => {
    window.PortfolioConsent.setDecision('rejected');
    window.PortfolioConsent.setDecision('accepted');
    location.assign('/works');
  });
  await page.waitForURL('**/works');
  await expect.poll(() => sent.length).toBe(2);
  const current = await page.evaluate(() => JSON.parse(localStorage.getItem('bn-analytics-consent-v1')));
  expect(original.timestamp).toBe(fixed);
  expect(current.timestamp).toBe(fixed);
  expect(current.generation).not.toBe(original.generation);
  expect(sent.map(event => event.event)).toEqual(['$pageview', '$pageview']);
  expect(sent[1].distinct_id).not.toBe(oldId);
  expect(JSON.stringify(sent)).not.toContain(current.generation);
});
