import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// The error document (2026-10-22) answers in the language of the request
// path, with the utility-page chrome: lilac bar, generated navigation and
// footer columns, the language menu, and links to the language's home, works
// index and contact form. It is noindex and never a 200.
const PAGES = [
  { path: "/this-page-does-not-exist", lang: "en", home: "/", works: "/works", contact: "/contact", title: "Page not found", menu: "Open navigation" },
  { path: "/hu/nincs-ilyen-oldal", lang: "hu", home: "/hu", works: "/hu/munkak", contact: "/hu/kapcsolat", title: "Az oldal nem található", menu: "Navigáció megnyitása" },
  { path: "/de/diese-seite-gibt-es-nicht", lang: "de", home: "/de", works: "/de/arbeiten", contact: "/de/kontakt", title: "Seite nicht gefunden", menu: "Navigation öffnen" },
];
const PALETTE = new Set(["rgb(214, 212, 237)", "rgb(10, 22, 40)", "rgb(27, 58, 50)", "rgb(189, 180, 20)", "rgb(255, 255, 255)", "rgb(247, 248, 248)"]);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("bn-analytics-consent-v1", JSON.stringify({ version: 1, decision: "rejected", timestamp: Date.now() }));
  });
});

for (const device of [{ name: "desktop", viewport: { width: 1440, height: 900 } }, { name: "mobile", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }]) {
  test.describe(device.name, () => {
    test.use({ viewport: device.viewport, isMobile: device.isMobile, hasTouch: device.hasTouch });
    for (const copy of PAGES) {
      test(`${copy.path} is the ${copy.lang} error document with the site chrome`, async ({ page }) => {
        const response = await page.goto(copy.path, { waitUntil: "load" });
        expect(response.status()).toBe(404);
        await expect(page.locator("html")).toHaveAttribute("lang", copy.lang);
        await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
        await expect(page.locator("main h1")).toHaveText(copy.title);
        await expect(page.locator(".navbar")).toBeVisible();
        await expect(page.locator(".menu-button")).toHaveAttribute("aria-label", copy.menu);
        await expect(page.locator("footer .footer-nav")).toHaveCount(1);
        await expect(page.locator(`main a[href="${copy.home}"]`)).toHaveCount(1);
        await expect(page.locator(`main a[href="${copy.works}"]`)).toHaveCount(1);
        await expect(page.locator(`main a.footer-email[href="${copy.contact}"]`)).toBeVisible();
        // On the palette: body and bar are paper or lilac, text is navy.
        const colours = await page.evaluate(() => ({
          body: getComputedStyle(document.body).backgroundColor,
          bar: getComputedStyle(document.querySelector(".navbar")).backgroundColor,
          h1: getComputedStyle(document.querySelector("main h1")).color,
          link: getComputedStyle(document.querySelector("main p a")).color,
        }));
        expect(colours.body, "page field").not.toBe("rgb(0, 0, 0)");
        expect(PALETTE.has(colours.bar), `bar ${colours.bar}`).toBe(true);
        // The utility pages set ink on paper; the title may be ink or navy, the links navy.
        expect(["rgb(17, 17, 17)", "rgb(10, 22, 40)"]).toContain(colours.h1);
        expect(colours.link).toBe("rgb(10, 22, 40)");
        // Every standalone link is at least 24px tall (WCAG 2.5.8); the capsule 44px.
        const targets = await page.locator("main a").evaluateAll((links) => links.map((link) => [link.textContent.trim(), Math.round(link.getBoundingClientRect().height)]));
        for (const [label, height] of targets) expect(height, label).toBeGreaterThanOrEqual(24);
        expect(targets.find(([, height]) => height >= 44), "the contact capsule").toBeTruthy();
        // The language menu leads to the other languages' homes.
        const switches = await page.locator("#primary-navigation a.lang-switch").evaluateAll((links) => links.map((link) => link.getAttribute("href")));
        expect(switches).toHaveLength(2);
        for (const href of switches) expect(["/", "/hu", "/de"]).toContain(href);
        const audit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
        expect(audit.violations).toEqual([]);
      });
    }
  });
}

test("the error documents are never served as pages and stay out of the sitemap", async ({ request }) => {
  for (const path of ["/404", "/404.html", "/hu/404", "/hu/404.html", "/de/404", "/de/404.html"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status(), path).toBe(404);
  }
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).not.toMatch(/404/);
});
