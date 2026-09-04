import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });

test.beforeEach(async ({ page }) => {
  page.consentFocusRequests = [];
  await page.route(/https:\/\/[^/]*posthog\.com\//, async (route) => {
    page.consentFocusRequests.push(route.request().method());
    await route.abort();
  });
  await page.route("**/assets/js/analytics-config.js", (route) => route.fulfill({
    contentType: "application/javascript",
    body: "window.PortfolioAnalyticsConfig = Object.freeze({ enabled: true });",
  }));
  await page.addInitScript(() => {
    localStorage.setItem("bn-analytics-consent-v1", JSON.stringify({
      version: 1, decision: "rejected", timestamp: Date.now(),
    }));
    window.consentFocusChanges = [];
    document.addEventListener("portfolio:consent-change", (event) => {
      window.consentFocusChanges.push(event.detail.accepted);
    });
  });
  await page.goto("/ai-integration");
  await page.waitForFunction(() => document.fonts.status === "loaded");
  await expect(page.locator("[data-consent-banner]")).toBeHidden();
});

test.afterEach(async ({ page }) => {
  expect(page.consentFocusRequests).toEqual([]);
  expect(await page.evaluate(() => window.consentFocusChanges)).toEqual([]);
  expect(await page.evaluate(() => window.PortfolioConsent.getDecision())).toBe("rejected");
});

async function keyboardTo(page, browserName, target) {
  // In this macOS WebKit profile, Option-Tab traverses links AND controls.
  // Safari documents the distinction; the site's tabindex is not modified.
  // https://support.apple.com/guide/safari/cpsh003/mac
  const key = browserName === "webkit" && process.platform === "darwin" ? "Alt+Tab" : "Tab";
  for (let step = 0; step < 40; step += 1) {
    await page.keyboard.press(key);
    if (await target.evaluate((element) => element === document.activeElement)) return;
  }
  throw new Error("The consent control was not reachable by full keyboard navigation");
}

for (const [opening, closing] of [
  ["pointer", "pointer"],
  ["keyboard", "keyboard"],
  ["pointer", "keyboard"],
  ["keyboard", "pointer"],
]) {
  test(`settings focus returns after ${opening} open and ${closing} close`, async ({ page, browserName }) => {
    const settings = page.locator("[data-consent-settings]");
    if (opening === "pointer") await settings.click();
    else {
      await keyboardTo(page, browserName, settings);
      await page.keyboard.press("Enter");
    }
    await expect(page.locator("#portfolio-consent-title")).toBeFocused();
    await expect(settings).toHaveAttribute("aria-expanded", "true");
    const close = page.getByRole("button", { name: "Close settings", exact: true });
    if (closing === "pointer") await close.click();
    else {
      await keyboardTo(page, browserName, close);
      await page.keyboard.press("Enter");
    }
    await expect(page.locator("[data-consent-banner]")).toBeHidden();
    await expect(settings).toHaveAttribute("aria-expanded", "false");
    await expect(settings).toBeFocused();
  });
}

test("a nested click returns to the actual invoker, not the first settings button", async ({ page }) => {
  await page.evaluate(() => {
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.id = "second-consent-settings";
    trigger.setAttribute("data-consent-settings", "");
    const label = document.createElement("span");
    label.textContent = "Secondary analytics settings";
    trigger.appendChild(label);
    document.querySelector(".footer-privacy").appendChild(trigger);
  });
  const trigger = page.locator("#second-consent-settings");
  await trigger.locator("span").click();
  await page.getByRole("button", { name: "Close settings", exact: true }).click();
  await expect(page.locator("[data-consent-banner]")).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("API opening still returns to the previously focused control", async ({ page }) => {
  const previous = page.locator("main button.footer-email");
  await previous.focus();
  await page.evaluate(() => window.PortfolioConsent.open());
  await expect(page.locator("#portfolio-consent-title")).toBeFocused();
  await page.getByRole("button", { name: "Close settings", exact: true }).click();
  await expect(previous).toBeFocused();
});
