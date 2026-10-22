import { expect, test } from "@playwright/test";

// A reader stays in the language they chose (owner request, 2026-10-22: on a
// German page every menu, footer and CTA link leads to a German page). This
// walks the rendered page, after the scripts ran and the menus were built, and
// clicks the menu like a reader would. scripts/check-language-links.mjs checks
// the same rule on the static files of every page.

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("nb-arrival-seen-v2", "1");
    localStorage.setItem("bn-analytics-consent-v1", JSON.stringify({ version: 1, decision: "rejected", timestamp: Date.now() }));
  });
  await page.route(/posthog\.com/, (route) => route.abort());
});

const languageOf = (path) => /^\/hu(?:\/|$)/.test(path) ? "hu" : /^\/de(?:\/|$)/.test(path) ? "de" : "en";

const ROUTES = {
  en: ["/", "/works", "/work/raiffeisen", "/about", "/web-development", "/ai-integration", "/contact", "/writing"],
  hu: ["/hu", "/hu/munkak", "/hu/munka/raiffeisen", "/hu/rolam", "/hu/webfejlesztes", "/hu/ai-tanacsadas-fejlesztes", "/hu/kapcsolat", "/hu/irasok"],
  de: ["/de", "/de/arbeiten", "/de/arbeit/raiffeisen", "/de/ueber-mich", "/de/webentwicklung", "/de/ki-beratung-entwicklung", "/de/kontakt", "/de/wissen"],
};

for (const [language, routes] of Object.entries(ROUTES)) {
  for (const route of routes) {
    test(`${route}: every rendered internal link stays in ${language} unless it is a language switch`, async ({ page }) => {
      await page.goto(route, { waitUntil: "load" });
      await expect(page.locator("html")).toHaveAttribute("lang", language);
      const links = await page.locator("a[href]").evaluateAll((anchors) => anchors.map((anchor) => ({
        href: anchor.getAttribute("href"), url: anchor.href, hreflang: anchor.getAttribute("hreflang"), lang: anchor.getAttribute("lang"),
        switcher: anchor.classList.contains("lang-switch"),
      })));
      const origin = new URL(page.url()).origin;
      const strays = links.filter((link) => {
        const url = new URL(link.url);
        if (url.origin !== origin && !/barnanorbert\.com$/.test(url.hostname)) return false;
        if (/^\/(?:assets|api)\//.test(url.pathname) || /\.(?:xml|txt)$/.test(url.pathname)) return false;
        const target = languageOf(url.pathname);
        if (target === language) return false;
        return !(link.switcher || (link.hreflang === target && link.lang === target));
      }).map((link) => link.href);
      expect(strays, `${route} links out of ${language}`).toEqual([]);
    });
  }

  test(`${routes[0]}: clicking every primary menu link lands on a ${language} page`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(routes[0], { waitUntil: "load" });
    const hrefs = await page.locator("#primary-navigation a[href^='/']:not(.lang-switch)").evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute("href")));
    expect(hrefs.length).toBeGreaterThan(4);
    for (const href of new Set(hrefs)) {
      const response = await page.goto(href, { waitUntil: "domcontentloaded" });
      expect(response?.status(), href).toBe(200);
      expect(languageOf(new URL(page.url()).pathname), href).toBe(language);
      await expect(page.locator("html"), href).toHaveAttribute("lang", language);
    }
  });
}
