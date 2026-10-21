import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Navigation groups and the language menu (owner request, 2026-10-21): the
// Services and Articles disclosures and the flag language menu are APG
// disclosure navigation, not ARIA menus. One group opens at a time, Escape
// returns focus to its button, leaving or clicking outside closes it, the
// compact disclosure shows the same groups as in-flow accordion rows, and
// without JavaScript every list simply stands open in flow.

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("nb-arrival-seen-v2", "1");
    localStorage.setItem("bn-analytics-consent-v1", JSON.stringify({ version: 1, decision: "rejected", timestamp: Date.now() }));
  });
  await page.route(/posthog\.com/, (route) => route.abort());
});

const LANGUAGES = {
  en: { route: "/", listHref: "/writing", articles: "Articles", latest: "Articles: latest", more: "All articles", trigger: "Language: EN, English", code: "EN", current: "English", other: "Magyar", pair: "/hu" },
  hu: { route: "/hu", listHref: "/hu/irasok", articles: "Tudástár", latest: "Tudástár: legújabb cikkek", more: "Összes cikk", trigger: "Nyelv: HU, Magyar", code: "HU", current: "Magyar", other: "English", pair: "/" },
};

async function open(page, route, width = 1280) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(route, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".menu-button")).toHaveAttribute("data-navigation-ready", "true");
}

for (const [language, copy] of Object.entries(LANGUAGES)) {
  test(`${copy.route}: the Articles group opens the latest articles of the page language and closes on Escape, outside click and focus loss`, async ({ page }) => {
    await open(page, copy.route);
    const group = page.locator('#primary-navigation .nav-group:has([aria-controls="nav-articles"])');
    const label = group.locator("> a.nav-link");
    const toggle = group.locator('[aria-controls="nav-articles"]');
    const panel = page.locator("#nav-articles");
    // The label is a native link to the list; the chevron beside it is the disclosure button.
    await expect(label).toHaveText(copy.articles);
    await expect(label).toHaveAttribute("href", copy.listHref);
    await expect(toggle).toHaveAccessibleName(copy.latest);
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(panel).toBeHidden();
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(panel).toBeVisible();
    const links = panel.locator("a");
    const count = await links.count();
    expect(count, "up to five articles plus the All articles row").toBeGreaterThanOrEqual(2);
    expect(count).toBeLessThanOrEqual(6);
    await expect(links.last()).toHaveText(copy.more);
    await expect(links.last()).toHaveAttribute("href", copy.listHref);
    const prefix = language === "hu" ? "/hu/irasok/" : "/writing/";
    for (const href of await links.evaluateAll((items) => items.slice(0, -1).map((item) => item.getAttribute("href")))) {
      expect(href, "every article in the panel belongs to the page language").toMatch(new RegExp(`^${prefix.replace(/\//g, "\\/")}[a-z0-9-]+$`));
      expect((await page.request.get(href, { maxRedirects: 0 })).status(), href).toBe(200);
    }
    // Every panel row is a 44px target on the lilac drop.
    for (const box of await links.evaluateAll((items) => items.map((item) => item.getBoundingClientRect().toJSON()))) {
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThan(0);
    }
    // Escape closes the group and returns focus to its button, without closing anything else.
    await links.first().focus();
    await page.keyboard.press("Escape");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(panel).toBeHidden();
    await expect(toggle).toBeFocused();
    // A click outside closes it.
    await toggle.click();
    await expect(panel).toBeVisible();
    await page.evaluate(() => document.querySelector("main").dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await expect(panel).toBeHidden();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    // Tabbing out of the group closes it on desktop, so the drop never lingers over the page.
    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(panel).toBeVisible();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Shift+Tab");
    await expect(panel).toBeHidden();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    // Navigation keys never trap focus: with the group closed, Tab walks on through the menu.
    expect(await page.evaluate(() => Boolean(document.activeElement.closest("#primary-navigation")))).toBe(true);
  });

  test(`${copy.route}: the language menu names the current language with its flag and links the pair`, async ({ page }) => {
    await open(page, copy.route);
    const menu = page.locator("#primary-navigation .nav-lang");
    const trigger = menu.locator(".nav-lang-trigger");
    const panel = page.locator("#nav-languages");
    expect(await menu.evaluate((element) => element.nextElementSibling), "the language menu is the last item of the navigation").toBeNull();
    await expect(trigger).toHaveAccessibleName(copy.trigger);
    await expect(trigger.locator(".nav-lang-code")).toHaveText(copy.code);
    await expect(trigger.locator(".nav-lang-code")).toBeVisible();
    await expect(trigger.locator(".nav-lang-name"), "desktop shows the code; the name is for the compact menu").toBeHidden();
    await expect(trigger.locator("svg.nav-flag")).toHaveAttribute("aria-hidden", "true");
    await expect(panel).toBeHidden();
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(panel).toBeVisible();
    const current = panel.locator(".nav-lang-current");
    await expect(current).toHaveText(copy.current);
    await expect(current).toHaveAttribute("aria-current", "true");
    await expect(current).toHaveAttribute("lang", language);
    await expect(current.locator("svg.nav-flag")).toHaveCount(1);
    const pair = panel.locator("a.lang-switch");
    await expect(pair).toHaveCount(1);
    await expect(pair).toHaveText(copy.other);
    await expect(pair).toHaveAccessibleName(copy.other);
    await expect(pair).toHaveAttribute("href", copy.pair);
    await expect(pair).toHaveAttribute("rel", "alternate");
    await expect(pair).toHaveAttribute("hreflang", language === "en" ? "hu" : "en");
    await expect(pair.locator("svg.nav-flag")).toHaveCount(1);
    // Both the panel text and the bar button keep navy on lilac (AA).
    const axe = await new AxeBuilder({ page }).include("#primary-navigation").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(axe.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`)).toEqual([]);
    // Choosing the pair leaves the page in the other language.
    await pair.click();
    await expect(page).toHaveURL(new RegExp(`${copy.pair.replace(/\//g, "\\/")}$`));
    await expect(page.locator("html")).toHaveAttribute("lang", language === "en" ? "hu" : "en");
  });

  test(`${copy.route} at 390: the compact disclosure shows the groups as accordion rows and keeps one open at a time`, async ({ page }) => {
    await open(page, copy.route, 390);
    await page.locator(".menu-button").click();
    await expect(page.locator("#primary-navigation")).toHaveAttribute("data-nav-menu-open", "");
    const toggles = page.locator("#primary-navigation [data-nav-toggle]");
    const expectedToggles = language === "hu" ? 3 : 2;
    await expect(toggles).toHaveCount(expectedToggles);
    const trigger = page.locator("#primary-navigation .nav-lang-trigger");
    await expect(trigger.locator(".nav-lang-name"), "compact shows the language name").toBeVisible();
    await expect(trigger.locator(".nav-lang-code")).toBeHidden();
    // Each group opens in flow, under its own row, and closes the previously open one.
    for (let index = 0; index < expectedToggles; index += 1) {
      const toggle = toggles.nth(index);
      const panel = page.locator(`#${await toggle.getAttribute("aria-controls")}`);
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      await expect(panel).toBeVisible();
      const placement = await panel.evaluate((element) => ({ position: getComputedStyle(element).position, left: element.getBoundingClientRect().left, width: element.getBoundingClientRect().width }));
      expect(placement.position, "compact panels are in flow, not floating drops").not.toBe("absolute");
      expect(placement.width).toBeGreaterThan(200);
      await expect(page.locator("#primary-navigation [data-nav-toggle][aria-expanded='true']"), "one group at a time").toHaveCount(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), "no horizontal overflow").toBeLessThanOrEqual(1);
    }
    // Escape inside an open group closes only the group; a second Escape closes the menu.
    const last = toggles.nth(expectedToggles - 1);
    await last.focus();
    await page.keyboard.press("Escape");
    await expect(last).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator(".menu-button")).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(page.locator(".menu-button")).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator(".menu-button")).toBeFocused();
  });
}

test("/hu: the Services group lists both Hungarian service pages and marks the current one from the service page", async ({ page }) => {
  await open(page, "/hu");
  const trigger = page.locator('#primary-navigation [aria-controls="nav-services"]');
  await expect(trigger).toHaveText("Szolgáltatások");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.click();
  const links = page.locator("#nav-services a");
  await expect(links).toHaveText(["Webfejlesztés", "AI tanácsadás és fejlesztés"]);
  await expect(links.nth(0)).toHaveAttribute("href", "/hu/webfejlesztes");
  await expect(links.nth(1)).toHaveAttribute("href", "/hu/ai-tanacsadas-fejlesztes");
  // Opening the Articles group closes Services.
  await page.locator('#primary-navigation [aria-controls="nav-articles"]').click();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#nav-services")).toBeHidden();
  await expect(page.locator("#nav-articles")).toBeVisible();
  await page.goto("/hu/webfejlesztes", { waitUntil: "load" });
  await expect(page.locator('#primary-navigation [aria-controls="nav-services"]')).toHaveAttribute("data-current", "");
  await expect(page.locator('#nav-services a[aria-current="page"]')).toHaveAttribute("href", "/hu/webfejlesztes");
  await expect(page.locator('#primary-navigation a.nav-link[aria-current]')).toHaveCount(0);
});

test("without JavaScript the bar keeps its height and each group opens on focus, so every panel link stays reachable", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.goto("/hu", { waitUntil: "load" });
  await expect(page.locator("html")).not.toHaveClass(/nav-enhanced/);
  for (const id of ["nav-services", "nav-articles", "nav-languages"]) {
    await expect(page.locator(`#${id}`), `${id} is closed until it is used, so the first paint never jumps`).toBeHidden();
  }
  const barHeight = await page.locator(".navbar").evaluate((nav) => nav.getBoundingClientRect().height);
  await page.locator('#primary-navigation [aria-controls="nav-services"]').focus();
  await expect(page.locator("#nav-services")).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.locator('#nav-services a[href="/hu/webfejlesztes"]')).toBeFocused();
  await page.locator("#primary-navigation .nav-lang-trigger").focus();
  await expect(page.locator("#nav-services")).toBeHidden();
  await expect(page.locator("#nav-languages")).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.locator("#primary-navigation a.lang-switch")).toBeFocused();
  await expect(page.locator("#primary-navigation a.lang-switch")).toHaveAttribute("href", "/");
  expect(await page.locator(".navbar").evaluate((nav) => nav.getBoundingClientRect().height), "the open panel is a drop, not a taller bar").toBe(barHeight);
  await context.close();
});

test("article pages and the list carry the same chrome as the static pages and mark Articles current", async ({ page }) => {
  await open(page, "/hu/irasok");
  await expect(page.locator('#primary-navigation a.nav-link[aria-current="page"]')).toHaveAttribute("href", "/hu/irasok");
  await expect(page.locator("#primary-navigation .nav-lang-trigger")).toHaveAccessibleName("Nyelv: HU, Magyar");
  await expect(page.locator("#primary-navigation a.lang-switch")).toHaveAttribute("href", "/writing");
  const article = await page.locator("#nav-articles a").first().getAttribute("href");
  await page.goto(article, { waitUntil: "load" });
  // On an article the group button carries the mark and the article's own row is current.
  await expect(page.locator('#primary-navigation a.nav-link[aria-current]')).toHaveCount(0);
  await expect(page.locator('#primary-navigation [aria-controls="nav-articles"]')).toHaveAttribute("data-current", "");
  await expect(page.locator(`#nav-articles a[aria-current="page"]`)).toHaveAttribute("href", article);
  await expect(page.locator(".writing-toc")).toHaveCount(1);
  await expect(page.locator(".footer-col-articles a")).toHaveCount(4);
});
