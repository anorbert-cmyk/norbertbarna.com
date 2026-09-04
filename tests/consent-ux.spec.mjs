import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Exercise the opt-in UI only through the static configuration response.
// Vendor requests are always intercepted; these tests never send analytics.
test.beforeEach(async ({ page }) => {
  await page.route("**/assets/js/analytics-config.js", (route) => route.fulfill({
    contentType: "application/javascript",
    body: "window.PortfolioAnalyticsConfig = Object.freeze({ enabled: true });",
  }));
  await page.route(/https:\/\/[^/]*posthog\.com\//, (route) => route.fulfill({
    status: 200, contentType: "application/json", body: '{"status":1}',
  }));
});

async function focusPosition(page) {
  // Native focus scrolling and the consent correction both settle before reading.
  return page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => {
    const element = document.activeElement;
    const box = element.getBoundingClientRect();
    const banner = document.querySelector("[data-consent-banner]");
    resolve({
      label: element.textContent.trim(), inside: banner.contains(element),
      tag: element.tagName, top: box.top, bottom: box.bottom,
      bannerTop: banner.getBoundingClientRect().top,
      settings: element.matches("[data-consent-settings]"),
    });
  }))));
}

for (const [language, path] of [["en", "/ai-integration"], ["hu", "/hu/ai-integracio"]]) {
  for (const [width, height] of [[320, 640], [390, 844], [768, 1024], [1440, 900], [720, 450]]) {
    // 720x450 is a 1440x900 desktop 200%-zoom CSS viewport equivalent,
    // not a claim of a native desktop zoom/assistive-technology test.
    test(`${language} ${width}x${height} keeps initial heading and keyboard actions clear of consent`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(path);
      await page.waitForFunction(() => document.fonts.status === "loaded");
      const banner = page.locator("[data-consent-banner]");
      await expect(banner).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await page.evaluate(() => document.activeElement.tagName)).toBe("BODY");
      if (height >= 640) {
        const heading = await page.locator("main h1").boundingBox();
        const overlay = await banner.boundingBox();
        expect(heading.y + heading.height, "A fresh mobile reader must see the full H1").toBeLessThanOrEqual(overlay.y);
      }
      await page.keyboard.press("Tab");
      await expect(page.locator(".skip-to-content")).toBeFocused();
      let reachedSettings = false;
      let pageActions = 0;
      for (let index = 0; index < 30; index += 1) {
        await page.keyboard.press("Tab");
        const focused = await focusPosition(page);
        if (focused.inside) break;
        expect(focused.tag, focused.label).not.toBe("BODY");
        expect(focused.top, focused.label).toBeGreaterThanOrEqual(0);
        expect(focused.bottom, `${focused.label} must not be covered by the banner`).toBeLessThanOrEqual(focused.bannerTop - 4);
        reachedSettings ||= focused.settings;
        pageActions += 1;
      }
      expect(pageActions).toBeGreaterThan(8);
      expect(reachedSettings, "The footer settings control also stays visible").toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`keyboard-${language}-${width}.png`) });
    });
  }
}

test("expanded details preserve full disclosures, direct privacy access and an unobscured page action", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/hu/ai-integracio");
  await page.waitForFunction(() => document.fonts.status === "loaded");
  const banner = page.locator("[data-consent-banner]");
  await expect(banner.locator(".consent-privacy")).toBeVisible();
  await expect(banner.locator(".consent-privacy")).toHaveAttribute("href", "/hu/adatvedelem");
  const summary = banner.locator("summary");
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(banner.locator(".consent-description")).toBeVisible();
  await expect(banner.locator(".consent-description")).toContainText("Nincs munkamenet-felvétel vagy hirdetési követés.");
  await expect(banner.locator(".consent-retention")).toBeVisible();
  await expect(banner.locator(".consent-retention")).toContainText("180 napig érvényes");
  await page.locator("main .footer-email").focus();
  const focused = await focusPosition(page);
  expect(focused.bottom).toBeLessThanOrEqual(focused.bannerTop - 4);
  expect(focused.top).toBeGreaterThanOrEqual(0);
  const audit = await new AxeBuilder({ page }).include("[data-consent-banner]")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(audit.violations).toEqual([]);
});

test("skip-to-content keeps its target near the top and no consent space remains after a decision", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ai-integration");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  const mainTop = await page.locator("main").evaluate((element) => element.getBoundingClientRect().top);
  expect(mainTop).toBeGreaterThanOrEqual(-1);
  expect(mainTop).toBeLessThan(200);
  await expect(page.locator(".consent-space")).toBeVisible();
  await page.getByRole("button", { name: "Decline analytics", exact: true }).click();
  await expect(page.locator("[data-consent-banner]")).toBeHidden();
  await expect(page.locator(".consent-space")).toBeHidden();
  expect(await page.locator(".consent-space").evaluate((element) => element.style.height)).toBe("");
});
