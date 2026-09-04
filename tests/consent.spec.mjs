import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const key = "bn-analytics-consent-v1";
const lifetime = 180 * 24 * 60 * 60 * 1000;
const fixtureGeneration = "b7b29f9b-3098-4ea4-91da-29e64d5415bc";
const generationPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

// A same-origin component fixture keeps this suite independent of page rollout.
// Only the production consent assets execute; no analytics integration is loaded.
async function openFixture(page, language = "en") {
  await page.route("**/assets/js/analytics-config.js", (route) => route.fulfill({
    contentType: "application/javascript",
    body: "window.PortfolioAnalyticsConfig = Object.freeze({ enabled: true });",
  }));
  await page.route("**/__consent-test*", (route) => route.fulfill({
    contentType: "text/html",
    body: `<!doctype html><html lang="${language}"><head>
      <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
      <title>Consent component test</title>
      <style>body{margin:0;font-family:Inter,sans-serif;color:#111;background:#f7f8f8}
      main,footer{padding:24px}main{min-height:240px}</style>
      <link rel="stylesheet" href="/assets/css/consent.css">
      <script defer src="/assets/js/analytics-config.js"></script>
      <script defer src="/assets/js/consent.js"></script>
      </head><body><a class="skip-to-content" href="#main-content">Skip to content</a>
      <main id="main-content" tabindex="-1"><h1>Portfolio fixture</h1>
      <button type="button" id="content-action">Content action</button></main>
      <footer lang="en"><div class="footer-privacy">
      <a href="/privacy">Privacy</a><a href="/hu/adatvedelem" lang="hu">Adatvédelem</a>
      <button type="button" data-consent-settings hidden>Analytics settings</button>
      </div></footer></body></html>`,
  }));
  await page.goto(`/__consent-test?lang=${language}`);
  await expect.poll(() => page.evaluate(() => typeof window.PortfolioConsent)).toBe("object");
}

async function state(page) {
  return page.evaluate(() => ({
    accepted: window.PortfolioConsent.hasConsent(),
    decision: window.PortfolioConsent.getDecision(),
  }));
}

test.beforeEach(async ({ page }) => {
  page.__consentErrors = [];
  page.on("pageerror", (error) => page.__consentErrors.push(error.message));
  await page.addInitScript(() => {
    window.__consentChanges = [];
    document.addEventListener("portfolio:consent-change", (event) => {
      window.__consentChanges.push({
        accepted: event.detail.accepted,
        observed: window.PortfolioConsent.hasConsent(),
      });
    });
  });
});

test.afterEach(async ({ page }) => {
  expect(page.__consentErrors).toEqual([]);
});

test("starts unset without autofocus, a modal, storage writes or cookies", async ({ page, context }) => {
  await openFixture(page);
  expect(await state(page)).toEqual({ accepted: false, decision: "unset" });
  const banner = page.getByRole("region", { name: "Optional analytics" });
  await expect(banner).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(banner).not.toHaveAttribute("aria-modal");
  await expect(page.locator("[data-consent-settings]")).not.toHaveAttribute("hidden");
  expect(await page.evaluate(() => document.activeElement.tagName)).toBe("BODY");
  await page.keyboard.press("Tab");
  await expect(page.locator(".skip-to-content")).toBeFocused();
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  expect(await context.cookies()).toEqual([]);
});

for (const [language, acceptedText, rejectedText] of [
  ["en", "You have allowed analytics.", "You have declined analytics."],
  ["hu", "A mérés jelenleg engedélyezve van.", "A mérés jelenleg ki van kapcsolva."],
]) {
  test(`${language} reopened settings announce the actual current decision`, async ({ page }) => {
    await openFixture(page, language);
    await expect(page.locator(".consent-current")).toBeHidden();
    for (const [decision, text] of [["accepted", acceptedText], ["rejected", rejectedText]]) {
      await page.evaluate((value) => {
        window.PortfolioConsent.setDecision(value);
        window.PortfolioConsent.open();
      }, decision);
      await expect(page.locator(".consent-current")).toBeVisible();
      await expect(page.locator(".consent-current")).toHaveText(text);
      await expect(page.locator(".consent-current")).toHaveAttribute("role", "status");
    }
  });
}

test("accepts only an explicit choice, persists the exact contract and survives reload", async ({ page }) => {
  await openFixture(page);
  await page.getByRole("button", { name: "Allow analytics", exact: true }).click();
  expect(await state(page)).toEqual({ accepted: true, decision: "accepted" });
  const saved = await page.evaluate((storageKey) => JSON.parse(localStorage.getItem(storageKey)), key);
  expect(Object.keys(saved).sort()).toEqual(["decision", "generation", "timestamp", "version"]);
  expect(saved).toMatchObject({ version: 1, decision: "accepted" });
  expect(saved.generation).toMatch(generationPattern);
  expect(saved.timestamp).toBeGreaterThan(Date.now() - 10_000);
  expect(saved.timestamp).toBeLessThanOrEqual(Date.now());
  expect(await page.evaluate(() => window.__consentChanges)).toEqual([{ accepted: true, observed: true }]);
  await expect(page.locator("[data-consent-banner]")).toBeHidden();
  await page.reload();
  expect(await state(page)).toEqual({ accepted: true, decision: "accepted" });
  await expect(page.locator("[data-consent-banner]")).toBeHidden();
});

test("remembers rejection without repeated prompting and can reopen from the static footer", async ({ page }) => {
  await openFixture(page);
  await page.getByRole("button", { name: "Decline analytics", exact: true }).click();
  expect(await state(page)).toEqual({ accepted: false, decision: "rejected" });
  await page.reload();
  await expect(page.locator("[data-consent-banner]")).toBeHidden();
  await page.getByRole("button", { name: "Analytics settings", exact: true }).click();
  await expect(page.locator("[data-consent-banner]")).toBeVisible();
  await expect(page.getByRole("button", { name: "Analytics settings", exact: true })).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("button", { name: "Close settings", exact: true }).click();
  await expect(page.locator("[data-consent-banner]")).toBeHidden();
  await expect(page.getByRole("button", { name: "Analytics settings", exact: true })).toBeFocused();
});

test("revoke is already false inside the synchronous change event", async ({ page }) => {
  await openFixture(page);
  await page.evaluate(() => window.PortfolioConsent.setDecision("accepted"));
  await page.getByRole("button", { name: "Analytics settings", exact: true }).click();
  await page.getByRole("button", { name: "Decline analytics", exact: true }).click();
  expect(await state(page)).toEqual({ accepted: false, decision: "rejected" });
  expect(await page.evaluate(() => window.__consentChanges)).toEqual([
    { accepted: true, observed: true }, { accepted: false, observed: false },
  ]);
});

test("invalid API decisions do not grant consent or change storage", async ({ page }) => {
  await openFixture(page);
  await page.evaluate(() => {
    [true, false, null, {}, "accept", "unset", "ACCEPTED"].forEach((value) => window.PortfolioConsent.setDecision(value));
  });
  expect(await state(page)).toEqual({ accepted: false, decision: "unset" });
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  expect(await page.evaluate(() => window.__consentChanges)).toEqual([]);
});

const invalidRecords = [
  ["malformed JSON", "{"],
  ["null record", "null"],
  ["array record", "[]"],
  ["wrong version", { version: 2, decision: "accepted", timestamp: "now", generation: fixtureGeneration }],
  ["unknown decision", { version: 1, decision: "yes", timestamp: "now" }],
  ["missing timestamp", { version: 1, decision: "accepted", generation: fixtureGeneration }],
  ["string timestamp", { version: 1, decision: "accepted", timestamp: "123", generation: fixtureGeneration }],
  ["future timestamp", { version: 1, decision: "accepted", timestamp: "future", generation: fixtureGeneration }],
  ["expired acceptance", { version: 1, decision: "accepted", timestamp: "expired", generation: fixtureGeneration }],
  ["expired rejection", { version: 1, decision: "rejected", timestamp: "expired" }],
  ["legacy timestamp-only acceptance", { version: 1, decision: "accepted", timestamp: "now" }],
  ["numeric generation", { version: 1, decision: "accepted", timestamp: "now", generation: 42 }],
  ["null generation", { version: 1, decision: "accepted", timestamp: "now", generation: null }],
  ["non-v4 generation", { version: 1, decision: "accepted", timestamp: "now", generation: fixtureGeneration.replace("-4ea4-", "-1ea4-") }],
  ["uppercase generation", { version: 1, decision: "accepted", timestamp: "now", generation: fixtureGeneration.toUpperCase() }],
  ["invalid UUID variant", { version: 1, decision: "accepted", timestamp: "now", generation: fixtureGeneration.replace("-91da-", "-71da-") }],
  ["unknown record field", { version: 1, decision: "accepted", timestamp: "now", generation: fixtureGeneration, unexpected: true }],
];

for (const [label, value] of invalidRecords) {
  test(`${label} is unset and never accepted`, async ({ page }) => {
    await page.addInitScript(({ storageKey, record, ttl }) => {
      if (record && typeof record === "object") {
        if (record.timestamp === "now") record.timestamp = Date.now();
        if (record.timestamp === "future") record.timestamp = Date.now() + 60_000;
        if (record.timestamp === "expired") record.timestamp = Date.now() - ttl;
      }
      localStorage.setItem(storageKey, typeof record === "string" ? record : JSON.stringify(record));
    }, { storageKey: key, record: value, ttl: lifetime });
    await openFixture(page);
    expect(await state(page)).toEqual({ accepted: false, decision: "unset" });
    expect(await page.evaluate((storageKey) => localStorage.getItem(storageKey), key)).toBeNull();
    await expect(page.locator("[data-consent-banner]")).toBeVisible();
  });
}

test("a valid decision expires at 180 days even in an already open document", async ({ page }) => {
  await page.addInitScript(() => {
    window.__consentNow = Date.now();
    Date.now = () => window.__consentNow;
  });
  await openFixture(page);
  await page.evaluate(() => window.PortfolioConsent.setDecision("accepted"));
  await page.evaluate((ttl) => { window.__consentNow += ttl - 1; }, lifetime);
  expect(await state(page)).toEqual({ accepted: true, decision: "accepted" });
  await page.evaluate(() => { window.__consentNow += 1; });
  expect(await state(page)).toEqual({ accepted: false, decision: "unset" });
  expect(await page.evaluate(() => window.PortfolioConsent.getRevision())).toBeNull();
  expect(await page.evaluate(() => window.__consentChanges.at(-1))).toEqual({ accepted: false, observed: false });
  await expect(page.locator("[data-consent-banner]")).toBeVisible();
});

test("expired stored consent is removed on read without touching unrelated data", async ({ page }) => {
  await page.addInitScript(({ storageKey, ttl, generation }) => {
    localStorage.setItem(storageKey, JSON.stringify({ version: 1, decision: "accepted", timestamp: Date.now() - ttl, generation }));
    localStorage.setItem("unrelated-test-value", "keep");
  }, { storageKey: key, ttl: lifetime, generation: fixtureGeneration });
  await openFixture(page);
  expect(await state(page)).toEqual({ accepted: false, decision: "unset" });
  expect(await page.evaluate((storageKey) => localStorage.getItem(storageKey), key)).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem("unrelated-test-value"))).toBe("keep");
});

test("invalid consent cleanup stays fail-closed when removal is blocked", async ({ page }) => {
  await page.addInitScript(({ storageKey, ttl, generation }) => {
    localStorage.setItem(storageKey, JSON.stringify({ version: 1, decision: "accepted", timestamp: Date.now() - ttl, generation }));
    window.__consentRemovalAttempts = 0;
    const original = Storage.prototype.removeItem;
    Storage.prototype.removeItem = function (name) {
      if (name === storageKey) {
        window.__consentRemovalAttempts += 1;
        throw new DOMException("Synthetic removal failure", "SecurityError");
      }
      return original.call(this, name);
    };
  }, { storageKey: key, ttl: lifetime, generation: fixtureGeneration });
  await openFixture(page);
  expect(await state(page)).toEqual({ accepted: false, decision: "unset" });
  expect(await page.evaluate(() => window.__consentRemovalAttempts)).toBeGreaterThan(0);
  expect(await page.evaluate((storageKey) => localStorage.getItem(storageKey), key)).not.toBeNull();
  await expect(page.locator("[data-consent-banner]")).toBeVisible();
});

test("consent revision is the stored acceptance generation and otherwise null", async ({ page }) => {
  await openFixture(page);
  expect(await page.evaluate(() => window.PortfolioConsent.getRevision())).toBeNull();
  await page.evaluate(() => window.PortfolioConsent.setDecision("accepted"));
  const generation = await page.evaluate((storageKey) => JSON.parse(localStorage.getItem(storageKey)).generation, key);
  expect(generation).toMatch(generationPattern);
  expect(await page.evaluate(() => window.PortfolioConsent.getRevision())).toBe(generation);
  await page.reload();
  expect(await page.evaluate(() => window.PortfolioConsent.getRevision())).toBe(generation);
  await page.evaluate(() => window.PortfolioConsent.setDecision("rejected"));
  expect(await page.evaluate(() => window.PortfolioConsent.getRevision())).toBeNull();
});

test("regrant has a distinct persisted generation at a fixed timestamp", async ({ page }) => {
  await page.addInitScript(() => { Date.now = () => Date.UTC(2026, 8, 4, 12); });
  await openFixture(page);
  const grants = await page.evaluate((storageKey) => {
    window.PortfolioConsent.setDecision("accepted");
    const first = window.PortfolioConsent.getRevision();
    const firstTimestamp = JSON.parse(localStorage.getItem(storageKey)).timestamp;
    window.PortfolioConsent.setDecision("rejected");
    window.PortfolioConsent.setDecision("accepted");
    return {
      first, second: window.PortfolioConsent.getRevision(), firstTimestamp,
      secondTimestamp: JSON.parse(localStorage.getItem(storageKey)).timestamp,
    };
  }, key);
  expect(grants.first).not.toBe(grants.second);
  expect(grants.first).toMatch(generationPattern);
  expect(grants.second).toMatch(generationPattern);
  expect(grants.firstTimestamp).toBe(grants.secondTimestamp);
  // No intermediate contact/action is needed to persist the replacement grant.
  await page.reload();
  expect(await page.evaluate(() => window.PortfolioConsent.getRevision())).toBe(grants.second);
});

test("a legacy rejection remains valid without a generation", async ({ page }) => {
  await page.addInitScript((storageKey) => {
    localStorage.setItem(storageKey, JSON.stringify({ version: 1, decision: "rejected", timestamp: Date.now() }));
  }, key);
  await openFixture(page);
  expect(await state(page)).toEqual({ accepted: false, decision: "rejected" });
  expect(await page.evaluate(() => window.PortfolioConsent.getRevision())).toBeNull();
  await expect(page.locator("[data-consent-banner]")).toBeHidden();
});

for (const failure of ["missing", "throws", "invalid output", "numeric output"]) {
  test(`crypto.randomUUID ${failure} cannot grant consent`, async ({ page }) => {
    await page.addInitScript((mode) => {
      Object.defineProperty(crypto, "randomUUID", { configurable: true, value: mode === "missing" ? undefined : () => {
        if (mode === "throws") throw new DOMException("Synthetic entropy failure", "OperationError");
        return mode === "numeric output" ? 42 : "not-a-uuid";
      } });
      Math.random = () => { throw new Error("Insecure random fallback must not be used"); };
    }, failure);
    await openFixture(page);
    await page.evaluate(() => window.PortfolioConsent.setDecision("accepted"));
    expect(await state(page)).toEqual({ accepted: false, decision: "unset" });
    expect(await page.evaluate(() => window.PortfolioConsent.getRevision())).toBeNull();
    expect(await page.evaluate((storageKey) => localStorage.getItem(storageKey), key)).toBeNull();
    await page.evaluate(() => window.PortfolioConsent.setDecision("rejected"));
    expect(await state(page)).toEqual({ accepted: false, decision: "rejected" });
  });
}

test("a substituted persisted generation fails closed", async ({ page }) => {
  await openFixture(page);
  await page.evaluate(({ storageKey, replacement }) => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === storageKey) {
        const record = JSON.parse(value);
        record.generation = replacement;
        value = JSON.stringify(record);
      }
      return original.call(this, name, value);
    };
    window.PortfolioConsent.setDecision("accepted");
  }, { storageKey: key, replacement: fixtureGeneration });
  expect(await state(page)).toEqual({ accepted: false, decision: "unset" });
  expect(await page.evaluate(() => window.PortfolioConsent.getRevision())).toBeNull();
});

test("a cross-tab replacement grant updates the generation even while accepted", async ({ page, context }) => {
  await openFixture(page);
  const first = await page.evaluate(() => {
    window.PortfolioConsent.setDecision("accepted");
    window.__consentRevisions = [];
    document.addEventListener("portfolio:consent-change", () => window.__consentRevisions.push(window.PortfolioConsent.getRevision()));
    return window.PortfolioConsent.getRevision();
  });
  const other = await context.newPage();
  await openFixture(other);
  const replacement = await other.evaluate(() => {
    window.PortfolioConsent.setDecision("accepted");
    return window.PortfolioConsent.getRevision();
  });
  expect(replacement).not.toBe(first);
  await expect.poll(() => page.evaluate(() => window.__consentRevisions.at(-1))).toBe(replacement);
  expect(await page.evaluate(() => window.PortfolioConsent.getRevision())).toBe(replacement);
  await other.close();
});

for (const failure of ["access", "read", "write", "silent write"]) {
  test(`storage ${failure} failure keeps analytics off with usable choices`, async ({ page }) => {
    await page.addInitScript(({ storageKey, mode }) => {
      if (mode === "access") {
        Object.defineProperty(window, "localStorage", { get() { throw new DOMException("Synthetic denial", "SecurityError"); } });
      } else {
        const method = mode === "read" ? "getItem" : "setItem";
        const original = Storage.prototype[method];
        Storage.prototype[method] = function (...args) {
          if (args[0] === storageKey) {
            if (mode === "silent write") return;
            throw new DOMException("Synthetic storage failure", "QuotaExceededError");
          }
          return original.apply(this, args);
        };
      }
    }, { storageKey: key, mode: failure });
    await openFixture(page);
    await page.getByRole("button", { name: "Allow analytics", exact: true }).click();
    expect(await state(page)).toEqual({ accepted: false, decision: "unset" });
    await expect(page.getByRole("status")).toContainText("Analytics is off on this page");
    await page.getByRole("button", { name: "Decline analytics", exact: true }).click();
    expect(await state(page)).toEqual({ accepted: false, decision: "rejected" });
  });
}

test("failed revoke cannot resurrect the previously stored acceptance in this document", async ({ page }) => {
  await openFixture(page);
  await page.evaluate(() => window.PortfolioConsent.setDecision("accepted"));
  await page.evaluate((storageKey) => {
    for (const method of ["setItem", "removeItem"]) {
      const original = Storage.prototype[method];
      Storage.prototype[method] = function (...args) {
        if (args[0] === storageKey) throw new DOMException("Synthetic storage failure", "QuotaExceededError");
        return original.apply(this, args);
      };
    }
    window.PortfolioConsent.setDecision("rejected");
  }, key);
  expect(await state(page)).toEqual({ accepted: false, decision: "rejected" });
  expect(await page.evaluate(() => window.__consentChanges.at(-1))).toEqual({ accepted: false, observed: false });
  await page.evaluate((storageKey) => {
    window.dispatchEvent(new StorageEvent("storage", { key: storageKey, storageArea: localStorage, newValue: localStorage.getItem(storageKey) }));
  }, key);
  expect(await state(page)).toEqual({ accepted: false, decision: "rejected" });
  await expect(page.getByRole("status")).toContainText("could not save your choice");
});

test("failed revoke removes only the consent key when removal still works", async ({ page }) => {
  await openFixture(page);
  await page.evaluate((storageKey) => {
    window.PortfolioConsent.setDecision("accepted");
    localStorage.setItem("unrelated-test-value", "keep");
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === storageKey) throw new DOMException("Synthetic storage failure", "QuotaExceededError");
      return original.call(this, name, value);
    };
    window.PortfolioConsent.setDecision("rejected");
  }, key);
  expect(await state(page)).toEqual({ accepted: false, decision: "rejected" });
  expect(await page.evaluate((storageKey) => localStorage.getItem(storageKey), key)).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem("unrelated-test-value"))).toBe("keep");
});

test("a later read failure revokes accepted state instead of trusting a cache", async ({ page }) => {
  await openFixture(page);
  await page.evaluate(() => {
    window.PortfolioConsent.setDecision("accepted");
    Storage.prototype.getItem = function () { throw new DOMException("Synthetic denial", "SecurityError"); };
  });
  expect(await state(page)).toEqual({ accepted: false, decision: "unset" });
  expect(await page.evaluate(() => window.__consentChanges.at(-1))).toEqual({ accepted: false, observed: false });
});

test("another tab can revoke consent through a real storage event", async ({ page, context }) => {
  await openFixture(page);
  await page.evaluate(() => window.PortfolioConsent.setDecision("accepted"));
  const other = await context.newPage();
  await openFixture(other);
  expect(await state(other)).toEqual({ accepted: true, decision: "accepted" });
  await other.evaluate(() => window.PortfolioConsent.setDecision("rejected"));
  await expect.poll(() => page.evaluate(() => window.__consentChanges.at(-1))).toEqual({ accepted: false, observed: false });
  expect(await state(page)).toEqual({ accepted: false, decision: "rejected" });
  await other.close();
});

test("cross-tab removal and corruption revoke while unrelated storage is ignored", async ({ page, context }) => {
  await openFixture(page);
  await page.evaluate(() => window.PortfolioConsent.setDecision("accepted"));
  const other = await context.newPage();
  await openFixture(other);
  await other.evaluate(() => localStorage.setItem("unrelated-test-value", "keep"));
  expect(await state(page)).toEqual({ accepted: true, decision: "accepted" });
  await other.evaluate((storageKey) => localStorage.removeItem(storageKey), key);
  await expect.poll(() => page.evaluate(() => window.__consentChanges.at(-1))).toEqual({ accepted: false, observed: false });
  expect(await state(page)).toEqual({ accepted: false, decision: "unset" });
  await page.evaluate(() => window.PortfolioConsent.setDecision("accepted"));
  await other.evaluate((storageKey) => localStorage.setItem(storageKey, "{broken"), key);
  await expect.poll(() => state(page)).toEqual({ accepted: false, decision: "unset" });
  await expect(page.locator("[data-consent-banner]")).toBeVisible();
  await other.close();
});

test("consent changes cause no network requests or cookies", async ({ page, context }) => {
  await openFixture(page);
  const requests = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.evaluate(() => {
    window.PortfolioConsent.setDecision("rejected");
    window.PortfolioConsent.open();
    window.PortfolioConsent.setDecision("accepted");
    window.PortfolioConsent.setDecision("rejected");
  });
  expect(requests).toEqual([]);
  expect(await context.cookies()).toEqual([]);
});

for (const [language, title, privacy, reject, accept] of [
  ["en", "Optional analytics", "/privacy", "Decline analytics", "Allow analytics"],
  ["hu-HU", "Választható látogatottságmérés", "/hu/adatvedelem", "Mérés elutasítása", "Mérés engedélyezése"],
]) {
  test(`${language} has equivalent accessible choices and compact reflow`, async ({ page }, testInfo) => {
    await openFixture(page, language);
    const banner = page.getByRole("region", { name: title });
    await expect(banner).toBeVisible();
    await expect(banner.locator("a")).toHaveAttribute("href", privacy);
    await expect(banner.locator(".consent-retention")).toContainText(language === "en" ? "valid in this browser for 180 days" : "180 napig érvényes");
    for (const width of [1366, 390, 320]) {
      await page.setViewportSize({ width, height: 800 });
      const choices = [];
      for (const name of [reject, accept]) {
        const button = page.getByRole("button", { name, exact: true });
        const box = await button.boundingBox();
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
        choices.push(await button.evaluate((element) => {
          const style = getComputedStyle(element);
          return [style.backgroundColor, style.color, style.borderWidth, style.borderRadius, style.fontSize, style.fontWeight, element.getBoundingClientRect().width];
        }));
      }
      expect(choices[0]).toEqual(choices[1]);
      expect(choices[0][2]).toBe("1px");
      expect(choices[0][3]).toBe("12px");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (width === 390) await page.screenshot({ path: testInfo.outputPath(`consent-${language}-390.png`) });
    }
    const audit = await new AxeBuilder({ page }).include("[data-consent-banner]").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(audit.violations).toEqual([]);
    await page.getByRole("button", { name: reject, exact: true }).focus();
    const outline = await page.getByRole("button", { name: reject, exact: true }).evaluate((element) => getComputedStyle(element).outlineStyle);
    expect(outline).not.toBe("none");
    await page.keyboard.press("Enter");
    expect(await state(page)).toEqual({ accepted: false, decision: "rejected" });
  });
}
