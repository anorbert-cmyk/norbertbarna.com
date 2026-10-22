import { expect, test } from "@playwright/test";

// The header must not move while a page loads: not when the self-hosted
// Funnel Display / Inter files arrive late (fonts.css ships metric-matched
// local fallbacks for that), and not because the compact menu starts open
// before navigation.js runs (About pages). Every language and bar type.
const PAGES = [
  "/", "/hu", "/de",
  "/works", "/hu/munkak",
  "/contact", "/hu/kapcsolat", "/de/kontakt",
  "/writing/human-in-the-loop-ai", "/hu/irasok/ceges-weboldal-ara", "/de/wissen/was-kostet-eine-website",
  "/ai-integration", "/hu/webfejlesztes", "/de",
  "/about", "/hu/rolam", "/de/ueber-mich",
];
const VIEWPORTS = [
  { name: "desktop", viewport: { width: 1440, height: 900 } },
  { name: "mobile", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
];
const FONT_DELAY = 900;
const CONTROLS = "#primary-navigation .nav-link, #primary-navigation .nav-lang-trigger, #primary-navigation .footer-contact-link, .nav-logo-wrap, .menu-button";

const measure = `(() => {
  const rect = (el) => { const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map((n) => Math.round(n * 10) / 10); };
  const bar = document.querySelector(".navbar");
  return {
    bar: bar ? rect(bar) : null,
    controls: [...document.querySelectorAll(${JSON.stringify(CONTROLS)})]
      .map((el) => ({ label: (el.getAttribute("aria-label") || el.textContent.trim()).slice(0, 40), box: rect(el) }))
      .filter((c) => c.box[2] && c.box[3]),
    fonts: document.fonts.status,
  };
})()`;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("bn-analytics-consent-v1", JSON.stringify({ version: 1, decision: "rejected", timestamp: Date.now() }));
    window.__shifts = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.hadRecentInput) continue;
        const sources = (entry.sources || []).map((s) => s.node).filter(Boolean);
        if (sources.some((node) => node.closest && node.closest(".navbar"))) window.__shifts.push({ value: entry.value, at: Math.round(entry.startTime) });
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
});

for (const device of VIEWPORTS) {
  test.describe(device.name, () => {
    test.use({ viewport: device.viewport, isMobile: device.isMobile, hasTouch: device.hasTouch });

    for (const path of [...new Set(PAGES)]) {
      test(`${path} keeps its header still while fonts arrive`, async ({ page, context }) => {
        await context.route(/\.woff2(\?|$)/, async (route) => {
          await new Promise((resolve) => setTimeout(resolve, FONT_DELAY));
          await route.continue();
        });
        await page.goto(path, { waitUntil: "domcontentloaded" });
        const before = await page.evaluate(measure);
        expect(before.bar, `${path}: header present`).not.toBeNull();
        expect(before.fonts, `${path}: measured before the web fonts landed`).toBe("loading");
        // CI and developer machines carry Arial or Liberation Sans; without a
        // local twin the metric-matched faces cannot exist, so say so plainly.
        const fallbackReady = await page.evaluate(() => document.fonts.check('14px "Inter Fallback"') && document.fonts.check('14px "Inter Fallback Caps"'));
        expect(fallbackReady, `${path}: metric-matched fallback faces resolve to a local Arial twin`).toBe(true);
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(250);
        const after = await page.evaluate(measure);
        expect(after.fonts).toBe("loaded");

        expect(after.bar, `${path}: header box must not change when fonts load`).toEqual(before.bar);
        expect(after.controls.length, `${path}: same controls before and after`).toBe(before.controls.length);
        // Metric-matched fallbacks keep every control within a few pixels of
        // its final place (measured 30px before the fallback faces existed).
        const tolerance = 6;
        for (const [index, control] of after.controls.entries()) {
          const first = before.controls[index];
          const message = `${path}: "${control.label}" moved from ${first.box} to ${control.box}`;
          expect(Math.abs(control.box[0] - first.box[0]), message).toBeLessThanOrEqual(tolerance);
          expect(Math.abs(control.box[2] - first.box[2]), message).toBeLessThanOrEqual(tolerance);
          expect(Math.abs(control.box[1] - first.box[1]), message).toBeLessThanOrEqual(1);
          expect(Math.abs(control.box[3] - first.box[3]), message).toBeLessThanOrEqual(1);
        }
        const shifts = await page.evaluate(() => window.__shifts);
        const total = shifts.reduce((sum, s) => sum + s.value, 0);
        expect(total, `${path}: header layout shift ${JSON.stringify(shifts)}`).toBeLessThan(0.01);
      });
    }

    for (const path of ["/about", "/hu/rolam", "/de/ueber-mich"]) {
      test(`${path} compact menu starts closed before navigation.js runs`, async ({ page, context }) => {
        await context.route(/\/assets\/js\/navigation\.js$/, (route) => route.abort());
        await page.goto(path, { waitUntil: "load" });
        const state = await page.evaluate(() => {
          const menu = document.querySelector("#primary-navigation");
          const bar = document.querySelector(".navbar").getBoundingClientRect();
          return { enhanced: document.documentElement.classList.contains("nav-enhanced"), display: getComputedStyle(menu).display, barHeight: Math.round(bar.height), compact: matchMedia("(max-width: 991px)").matches };
        });
        expect(state.enhanced).toBe(false);
        if (state.compact) expect(state.display, `${path}: no open-menu flash before JavaScript`).toBe("none");
        expect(state.barHeight).toBe(64);
      });
    }
  });
}
