import { readFileSync } from "node:fs";
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
        // entry.value covers every element that moved in the frame (a hero
        // heading reflowing on font swap included). Score only the header's
        // own sources with the layout-shift formula: impact × distance.
        const vw = innerWidth, vh = innerHeight;
        for (const source of entry.sources || []) {
          const node = source.node;
          if (!node || !node.closest || !node.closest(".navbar")) continue;
          const a = source.previousRect, b = source.currentRect;
          const union = (Math.max(a.right, b.right) - Math.min(a.left, b.left)) * (Math.max(a.bottom, b.bottom) - Math.min(a.top, b.top));
          const distance = Math.max(Math.abs(a.left - b.left), Math.abs(a.top - b.top));
          window.__shifts.push({ value: (union / (vw * vh)) * (distance / Math.max(vw, vh)), at: Math.round(entry.startTime), dx: b.left - a.left, dy: b.top - a.top, node: node.className || node.tagName });
        }
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
        // The fallback faces are local Arial or Liberation Sans. Load them
        // explicitly: fonts.check() reports an unused local face as unloaded.
        const fallbackReady = await page.evaluate(async () => {
          const faces = await Promise.all(['14px "Inter Fallback"', '14px "Inter Fallback Caps"', '700 14px "Funnel Display Fallback"'].map((font) => document.fonts.load(font).catch(() => [])));
          return faces.every((list) => list.length > 0 && list.every((face) => face.status === "loaded"));
        });
        if (!fallbackReady) test.info().annotations.push({ type: "warning", description: `${path}: no local Arial twin, only the bar box and row are checked` });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(250);
        const after = await page.evaluate(measure);
        expect(after.fonts).toBe("loaded");

        expect(after.bar, `${path}: header box must not change when fonts load`).toEqual(before.bar);
        expect(after.controls.length, `${path}: same controls before and after`).toBe(before.controls.length);
        // Metric-matched fallbacks keep every control close to its final
        // place (the menu block moved 30px before the fallback faces existed).
        // A size-adjust matches the average advance, not every glyph, so a
        // right-aligned row still drifts a few pixels per word: 8px on the
        // uppercase EN/HU bars and 14px on the DE/service bars with Liberation
        // Sans standing in (CI). Rows and heights must not move at all.
        // Without a local Arial twin the browser cannot size the fallback.
        const tolerance = fallbackReady ? 16 : Infinity;
        // On a miss, say where every control sat and which local font stood in.
        const probes = await page.evaluate(() => {
          const width = (font) => { const s = document.createElement("span"); s.style.cssText = `position:absolute;white-space:nowrap;font:${font}`; s.textContent = "WORKS SERVICES ARTICLES ABOUT CONTACT LINKEDIN Munkák Szolgáltatások"; document.body.append(s); const w = s.getBoundingClientRect().width; s.remove(); return Math.round(w); };
          return Object.fromEntries(['400 14px Inter', '400 14px "Inter Fallback"', '400 14px "Inter Fallback Caps"', '400 14px Arial', '400 14px "Liberation Sans"', '400 14px "DejaVu Sans"', '400 14px sans-serif'].map((font) => [font, width(font)]));
        });
        const report = after.controls.map((control, index) => `${control.label}: ${before.controls[index]?.box} -> ${control.box}`).join("\n  ");
        for (const [index, control] of after.controls.entries()) {
          const first = before.controls[index];
          const message = `${path}: "${control.label}" moved from ${first.box} to ${control.box}\n  ${report}\n  probes ${JSON.stringify(probes)}`;
          expect(Math.abs(control.box[0] - first.box[0]), message).toBeLessThanOrEqual(tolerance);
          expect(Math.abs(control.box[2] - first.box[2]), message).toBeLessThanOrEqual(tolerance);
          expect(Math.abs(control.box[1] - first.box[1]), message).toBeLessThanOrEqual(1);
          expect(Math.abs(control.box[3] - first.box[3]), message).toBeLessThanOrEqual(1);
        }
        const shifts = await page.evaluate(() => window.__shifts);
        const total = shifts.reduce((sum, s) => sum + s.value, 0);
        // The residual horizontal drift above scores ~0.0002; the bar itself
        // and the row must contribute nothing.
        expect(total, `${path}: header layout shift ${JSON.stringify(shifts)}`).toBeLessThan(0.01);
        for (const shift of shifts) expect(Math.abs(shift.dy), `${path}: header source moved vertically ${JSON.stringify(shift)}`).toBeLessThanOrEqual(1);
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
        expect(state.barHeight, `${path}: shared bar height`).toBe(state.compact ? 56 : 64);
      });
    }
  });
}

// One bar geometry on every page type and language: moving between the home,
// a service page, the writing section, Works, Contact or About (or switching
// language) must not change the header height or move the logo, the menu
// button or the language control. Colours stay per page type.
const SITEMAP_PAGES = [...readFileSync(new URL("../sitemap.xml", import.meta.url), "utf8").matchAll(/<loc>https:\/\/www\.barnanorbert\.com([^<]*)<\/loc>/g)]
  .map((match) => match[1] || "/")
  // The three error documents share the bar too (2026-10-22).
  .concat(["/this-page-does-not-exist", "/hu/nincs-ilyen-oldal", "/de/diese-seite-gibt-es-nicht"]);

for (const device of VIEWPORTS) {
  test.describe(`${device.name} geometry`, () => {
    test.use({ viewport: device.viewport, isMobile: device.isMobile, hasTouch: device.hasTouch });
    test("every page shares one header height, logo box, menu button and language control", async ({ page }) => {
      test.setTimeout(240_000);
      const seen = new Map();
      for (const path of SITEMAP_PAGES) {
        await page.goto(path, { waitUntil: "load" });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(150);
        const geometry = await page.evaluate(() => {
          const rect = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(Math.round).join(","); };
          const bar = document.querySelector(".navbar");
          return {
            bar: rect(bar),
            logo: rect(document.querySelector(".nav-logo-wrap")),
            button: rect(document.querySelector(".menu-button")),
            language: rect(document.querySelector(".nav-lang-trigger")),
            menuRight: (() => { const nav = document.querySelector("#primary-navigation"); const r = nav && nav.getBoundingClientRect(); return r && r.width ? Math.round(r.right) : null; })(),
            // The destinations share one type (size, weight, case) and 44px
            // rows on every bar; the Articles chevron paints in the same ink
            // as the links beside it, so it is visible on the navy bars too.
            // Case pages carry Works in the breadcrumb and hide the duplicate
            // .case-nav-works destination on desktop; hidden rows are skipped.
            links: [...document.querySelectorAll("#primary-navigation .nav-menu-area .nav-link")].filter((el) => getComputedStyle(el).display !== "none").map((el) => { const s = getComputedStyle(el); return { type: `${s.fontSize} ${s.fontWeight} ${s.textTransform}`, height: Math.round(el.getBoundingClientRect().height), color: s.color, current: el.hasAttribute("aria-current") }; }),
            toggle: (() => { const t = document.querySelector("#primary-navigation .nav-group-toggle"); return t ? getComputedStyle(t).color : null; })(),
          };
        });
        seen.set(path, geometry);
      }
      const reference = seen.get("/");
      const compact = device.name === "mobile";
      expect(reference.bar, "home bar").toBe(compact ? "0,0,390,56" : "0,0,1440,64");
      expect(reference.logo, "home logo box").toBe(compact ? "22,6,44,44" : "22,10,44,44");
      for (const [path, geometry] of seen) {
        expect(geometry.bar, `${path}: bar box`).toBe(reference.bar);
        expect(geometry.logo, `${path}: logo box`).toBe(reference.logo);
        expect(geometry.button, `${path}: menu button`).toBe(reference.button);
        expect(geometry.language, `${path}: language control`).toBe(reference.language);
        expect(geometry.menuRight, `${path}: menu right edge`).toBe(reference.menuRight);
        if (compact) continue;
        expect(geometry.links.length, `${path}: destinations`).toBeGreaterThan(4);
        for (const link of geometry.links) {
          expect(link.type, `${path}: link type`).toBe(reference.links[0].type);
          expect(link.height, `${path}: link row height`).toBeGreaterThanOrEqual(44);
        }
        const plain = geometry.links.find((link) => !link.current) || geometry.links[0];
        expect(geometry.toggle, `${path}: the Articles chevron takes the link ink`).toBe(plain.color);
      }
    });
  });
}
