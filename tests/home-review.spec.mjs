import { expect, test } from "@playwright/test";

// Design review round 1 (2026-10-23), home package: the intro statement sets
// without a forced break or a one-word orphan, the mast label stays inside the
// content edge on a 12px floor, the service grid never outgrows the viewport on
// the Hungarian home, every service title fits two lines and the titles of a
// row start together, the linked title rests like its siblings, the decorative
// domain strip is never a Tab stop, and the compact menu keeps the shared rows.

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("nb-arrival-seen-v2", "1");
    localStorage.setItem("bn-analytics-consent-v1", JSON.stringify({ version: 1, decision: "rejected", timestamp: Date.now() }));
  });
});

const lineWidths = `(element) => {
  const range = document.createRange(); range.selectNodeContents(element);
  const rows = [];
  for (const rect of range.getClientRects()) {
    if (!rect.width) continue;
    const row = rows.find((r) => Math.abs(r.top - rect.top) < 4);
    if (row) { row.left = Math.min(row.left, rect.left); row.right = Math.max(row.right, rect.right); }
    else rows.push({ top: rect.top, left: rect.left, right: rect.right });
  }
  return rows.map((r) => r.right - r.left);
}`;

for (const [path, language] of [["/", "English"], ["/hu", "Hungarian"]]) {
  for (const width of [1024, 1440, 1920]) {
    test(`${language} ${width}: the intro, mast label and service cards hold their measure`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(path, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      const state = await page.evaluate(`(() => {
        const lineWidths = ${lineWidths};
        const copy = document.querySelector(".home-banner-subtitle");
        const label = document.querySelector(".home-mast .metric-context");
        const wrap = label.closest(".home-banner-content-wrap").getBoundingClientRect();
        const items = [...document.querySelectorAll(".service-item")];
        return {
          copyLines: lineWidths(copy), copyFont: parseFloat(getComputedStyle(copy).fontSize),
          hasBreak: Boolean(copy.querySelector("br")),
          labelOverflow: label.scrollWidth - label.clientWidth, labelRight: label.getBoundingClientRect().right, wrapRight: wrap.right,
          labelFont: parseFloat(getComputedStyle(label).fontSize),
          metaFont: parseFloat(getComputedStyle(document.querySelector(".work-row-meta")).fontSize),
          pageOverflow: document.documentElement.scrollWidth - innerWidth,
          lastRight: items[items.length - 1].getBoundingClientRect().right,
          titles: [...document.querySelectorAll(".home-service-card-title")].map((title) => ({
            text: title.textContent.trim(), lines: lineWidths(title).length,
            top: Math.round(title.getBoundingClientRect().top),
            decoration: getComputedStyle(title.querySelector("a") || title).textDecorationLine,
          })),
          linkRoles: document.querySelectorAll('a[role="listitem"]').length,
        };
      })()`);
      expect(state.hasBreak, "no forced break in the intro statement").toBe(false);
      expect(state.copyLines.length).toBeLessThanOrEqual(4);
      const last = state.copyLines[state.copyLines.length - 1];
      expect(last, "the last intro line is not a one-word orphan").toBeGreaterThan(state.copyFont * 4);
      expect(state.labelOverflow, "the mast label fits its box").toBe(0);
      expect(state.labelRight).toBeLessThanOrEqual(state.wrapRight + 1);
      expect(state.labelFont).toBeGreaterThanOrEqual(12);
      expect(state.metaFont).toBeGreaterThanOrEqual(12);
      expect(state.pageOverflow).toBeLessThanOrEqual(1);
      expect(state.lastRight, "the third service column ends inside the viewport").toBeLessThanOrEqual(width);
      expect(state.linkRoles).toBe(0);
      for (const title of state.titles) {
        expect(title.lines, `${title.text} fits two lines`).toBeLessThanOrEqual(2);
        expect(title.decoration, `${title.text} rests without an underline`).toBe("none");
      }
      expect(new Set(state.titles.map((title) => title.top)).size, "the titles of a row start on the same line").toBeLessThanOrEqual(2);
    });
  }

  test(`${language} 390: the domain strip is not a Tab stop and the menu keeps the shared 56px rows`, async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    await page.addInitScript(() => {
      sessionStorage.setItem("nb-arrival-seen-v2", "1");
      localStorage.setItem("bn-analytics-consent-v1", JSON.stringify({ version: 1, decision: "rejected", timestamp: Date.now() }));
    });
    try {
      await page.goto(path, { waitUntil: "load" });
      const strip = page.locator(".home-about-marquee-area");
      await expect(strip).toHaveAttribute("tabindex", "-1");
      await expect(strip).toHaveAttribute("aria-hidden", "true");
      const hiddenStops = [];
      for (let step = 0; step < 50; step += 1) {
        await page.keyboard.press("Tab");
        const stop = await page.evaluate(() => {
          const active = document.activeElement;
          return { body: active === document.body, hidden: Boolean(active.closest('[aria-hidden="true"]')), name: String(active.className) };
        });
        if (stop.body && step > 3) break;
        if (stop.hidden) hiddenStops.push(stop.name);
      }
      expect(hiddenStops, "no Tab stop inside aria-hidden content").toEqual([]);
      await page.evaluate(() => scrollTo(0, 0));
      await page.locator(".menu-button").click();
      await expect(page.locator("#primary-navigation")).toBeVisible();
      const rows = await page.locator("#primary-navigation :is(.nav-link, .footer-contact-link, .nav-lang-trigger)").evaluateAll((links) =>
        links.filter((link) => link.getBoundingClientRect().height > 0).map((link) => Math.round(link.getBoundingClientRect().top)));
      expect(rows.length).toBeGreaterThan(3);
      for (let index = 1; index < rows.length; index += 1) {
        expect(rows[index] - rows[index - 1], "compact menu rows sit 56px apart like every other page").toBe(56);
      }
    } finally {
      await page.close();
    }
  });
}
