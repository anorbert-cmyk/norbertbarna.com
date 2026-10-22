import { expect, test } from "@playwright/test";

// UX findings of 2026-10-22: the compact menu locks the page and scrolls on
// its own; the language menu of an untranslated article says where it leads;
// standalone text links keep 24px targets; the service-page footer shows
// LinkedIn with its icon and label; the case measurement note reads at body
// size; the home button, skip link and scroll affordance stay on the palette;
// the contact page holds the Turnstile notice until the visitor acts and docks
// the consent notice below the form.

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("nb-arrival-seen-v2", "1");
  });
  await page.route(/posthog\.com/, (route) => route.abort());
});

const rejected = (page) => page.addInitScript(() => {
  localStorage.setItem("bn-analytics-consent-v1", JSON.stringify({ version: 1, decision: "rejected", timestamp: Date.now() }));
});

test.describe("compact menu", () => {
  test.use({ viewport: { width: 390, height: 600 }, isMobile: true, hasTouch: true });

  test("locks the page while open and scrolls its own rows", async ({ page }) => {
    await rejected(page);
    // Shorter than the menu's eight rows, so the rows must scroll inside it.
    await page.setViewportSize({ width: 390, height: 420 });
    await page.goto("/works", { waitUntil: "load" });
    await page.evaluate(() => scrollTo({ top: 600, behavior: "instant" }));
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(500);
    // A dispatched click: Playwright's own pointer actions first scroll the
    // sticky bar "into view", which would move the page before the lock.
    await page.locator(".menu-button").dispatchEvent("click");
    await expect(page.locator("html")).toHaveAttribute("data-menu-open", "");
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflowY)).toBe("hidden");
    const before = await page.evaluate(() => scrollY);
    expect(before, "opening the menu does not move the page").toBe(600);
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => scrollY), "the page behind the menu does not move").toBe(before);
    const menu = page.locator("#primary-navigation");
    const metrics = await menu.evaluate((el) => ({ overflow: getComputedStyle(el).overflowY, height: el.getBoundingClientRect().height, scrollHeight: el.scrollHeight, bottom: el.getBoundingClientRect().bottom }));
    expect(metrics.overflow).toBe("auto");
    expect(metrics.bottom, "the menu ends inside the viewport").toBeLessThanOrEqual(420);
    expect(metrics.scrollHeight, "the rows scroll inside the menu").toBeGreaterThan(metrics.height);
    await menu.evaluate((el) => { el.scrollTop = el.scrollHeight; });
    await expect(page.locator("#primary-navigation .nav-lang-trigger")).toBeInViewport();
    await page.locator(".menu-button").dispatchEvent("click");
    await expect(page.locator("html")).not.toHaveAttribute("data-menu-open", "");
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflowY)).not.toBe("hidden");
  });
});

test("an untranslated article names the list its language links lead to", async ({ page }) => {
  await rejected(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/writing/human-in-the-loop-ai", { waitUntil: "load" });
  const links = await page.locator("#primary-navigation a.lang-switch").evaluateAll((anchors) => anchors.map((a) => ({ text: a.textContent.trim(), href: a.getAttribute("href"), rel: a.getAttribute("rel") })));
  for (const link of links) {
    if (link.rel === "alternate") continue;
    expect(link.href, link.text).toMatch(/^\/(?:hu\/irasok|de\/wissen|writing)$/);
    expect(link.text).toMatch(/^(?:Magyar: összes cikk|Deutsch: alle Artikel|English: all articles)$/);
    expect(link.text).not.toMatch(/[–—-]/);
  }
  expect(links.some((link) => link.rel !== "alternate"), "this article has an untranslated language").toBe(true);
  // A translated pair keeps the plain language name.
  await page.goto("/hu/irasok", { waitUntil: "load" });
  await expect(page.locator("#primary-navigation a.lang-switch").first()).toHaveText("English");
});

test("standalone text links on the writing pages are at least 24px tall", async ({ page }) => {
  await rejected(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const path of ["/writing/human-in-the-loop-ai", "/writing", "/hu/irasok"]) {
    await page.goto(path, { waitUntil: "load" });
    const targets = await page.locator(".writing-breadcrumb a, .writing-meta a, .writing-count a").evaluateAll((links) => links.map((link) => [link.textContent.trim(), Math.round(link.getBoundingClientRect().height)]));
    expect(targets.length, path).toBeGreaterThan(0);
    for (const [label, height] of targets) expect(height, `${path}: ${label}`).toBeGreaterThanOrEqual(24);
  }
});

test("the service-page footer shows LinkedIn with its icon and label and a readable utility row", async ({ page }) => {
  await rejected(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const path of ["/ai-integration", "/hu/webfejlesztes", "/de"]) {
    await page.goto(path, { waitUntil: "load" });
    const link = page.locator(".ai-footer a.footer-contact-link");
    await link.scrollIntoViewIfNeeded();
    const state = await link.evaluate((el) => { const icon = el.querySelector(".footer-icon"); const r = el.getBoundingClientRect(); return { icon: icon ? icon.getBoundingClientRect().width : 0, label: el.textContent.trim(), underline: getComputedStyle(el).textDecorationLine, height: r.height }; });
    expect(state.icon, `${path}: icon`).toBeGreaterThanOrEqual(16);
    expect(state.label).toBe("LinkedIn");
    expect(state.underline).toContain("underline");
    expect(state.height).toBeGreaterThanOrEqual(48);
    const utility = await page.locator(".ai-footer-bottom nav a").first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(utility, `${path}: utility row`).toBeGreaterThanOrEqual(14);
  }
  // At 320px the compact footer rule no longer squeezes the link to a 44px square.
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/ai-integration", { waitUntil: "load" });
  const narrow = await page.locator(".ai-footer a.footer-contact-link").evaluate((el) => { const range = document.createRange(); range.selectNodeContents(el); const rects = [...range.getClientRects()].filter((r) => r.width > 0); return { left: Math.min(...rects.map((r) => r.left)), right: Math.max(...rects.map((r) => r.right)), width: el.getBoundingClientRect().width }; });
  expect(narrow.left, "icon and label start inside the canvas").toBeGreaterThanOrEqual(0);
  expect(narrow.right).toBeLessThanOrEqual(320);
  expect(narrow.width).toBeGreaterThan(60);
});

test("the case measurement note reads at body size in a readable measure", async ({ page }) => {
  await rejected(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/work/raiffeisen", { waitUntil: "load" });
  const note = page.locator(".case-evidence-note").first();
  const metrics = await note.evaluate((el) => { const s = getComputedStyle(el); const probe = document.createElement("span"); probe.textContent = "x".repeat(100); probe.style.cssText = `position:absolute;white-space:nowrap;font:${s.font}`; el.appendChild(probe); const cpl = (el.getBoundingClientRect().width / probe.getBoundingClientRect().width) * 100; probe.remove(); return { size: parseFloat(s.fontSize), cpl }; });
  expect(metrics.size).toBeGreaterThanOrEqual(17);
  expect(metrics.cpl, "65 to 80 characters per line").toBeLessThanOrEqual(80);
  const chip = await page.locator(".case-toc a").first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(chip).toBeGreaterThanOrEqual(14);
});

test("the home case-studies button, the skip link and the scroll affordance stay on the palette", async ({ page }) => {
  await rejected(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { waitUntil: "load" });
  await expect(page.locator(".dark-button.projects")).toHaveCSS("background-color", "rgb(10, 22, 40)");
  await page.keyboard.press("Tab");
  const skip = page.locator(".skip-to-content");
  await expect(skip).toBeFocused();
  await expect(skip).toHaveCSS("outline-color", "rgb(189, 180, 20)");
  await expect(skip).toHaveCSS("background-color", "rgb(10, 22, 40)");
  const scroll = page.locator(".home-mast-scroll");
  await scroll.focus();
  const ring = await scroll.evaluate((el) => { const s = getComputedStyle(el); return [s.outlineStyle, s.outlineWidth, s.outlineColor]; });
  expect(ring[0]).toBe("solid");
  expect(ring[1]).toBe("3px");
  expect(ring[2]).toBe("rgb(17, 17, 17)");
});

test.describe("contact", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("the Turnstile load notice waits for the visitor's first move", async ({ page }) => {
    await rejected(page);
    await page.route(/challenges\.cloudflare\.com/, (route) => route.abort());
    await page.goto("/contact", { waitUntil: "load" });
    await page.waitForTimeout(1200);
    await expect(page.locator(".contact-status")).toHaveText("");
    await page.locator("#contact-name").focus();
    await expect(page.locator(".contact-status")).toContainText("could not load");
  });

  test("the consent notice docks below the form and covers no field", async ({ page }) => {
    await page.goto("/contact", { waitUntil: "load" });
    const banner = page.locator("[data-consent-banner]");
    await expect(banner).toHaveCount(1);
    await expect(banner).toHaveCSS("position", "static");
    const order = await page.evaluate(() => { const banner = document.querySelector("[data-consent-banner]"); return { afterForm: Boolean(document.querySelector("#contact-form").compareDocumentPosition(banner) & Node.DOCUMENT_POSITION_FOLLOWING), beforeFooter: Boolean(banner.compareDocumentPosition(document.querySelector("body > footer")) & Node.DOCUMENT_POSITION_FOLLOWING), space: document.querySelector(".consent-space").hidden }; });
    expect(order).toEqual({ afterForm: true, beforeFooter: true, space: true });
    for (const field of ["#contact-name", "#contact-email", "#contact-message"]) {
      await page.locator(field).scrollIntoViewIfNeeded();
      const covered = await page.locator(field).evaluate((el) => { const r = el.getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return Boolean(top && top.closest("[data-consent-banner]")); });
      expect(covered, `${field} is not under the notice`).toBe(false);
    }
    await expect(page.locator(".contact-sent-text")).toHaveAttribute("aria-live", "polite");
  });
});
