import { expect, test } from "@playwright/test";

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`case first paint stays in place when navigation loads late at ${viewport.width}px without GSAP`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.addInitScript(() => {
      sessionStorage.setItem("nb-arrival-seen-v2", "1");
      localStorage.setItem("bn-analytics-consent-v1", JSON.stringify({ version: 1, decision: "rejected", timestamp: Date.now() }));
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route(/\/vendor\/(?:gsap|ScrollTrigger)\.min\.js(?:\?.*)?$/, (route) => route.abort());
    let releaseNavigation;
    const navigationGate = new Promise((resolve) => { releaseNavigation = resolve; });
    let navigationRequested = false;
    await page.route(/\/immersive-navigation\.[a-f\d]+\.js(?:\?.*)?$/, async (route) => {
      navigationRequested = true;
      await navigationGate;
      await route.continue();
    });

    const geometry = () => page.evaluate(() => {
      const rect = (selector) => {
        const box = document.querySelector(selector).getBoundingClientRect();
        return { x: box.x, y: box.y, width: box.width, height: box.height };
      };
      return { nav: rect(".navbar"), banner: rect(".case-study-header .banner-section"), title: rect("#case-title") };
    });
    const paint = () => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    let firstPaint;
    try {
      // The held classic script pauses the parser, so DOMContentLoaded would
      // wait for the very enhancement whose first-paint shift we are measuring.
      await page.goto("/work/instructure", { waitUntil: "commit" });
      await expect.poll(() => navigationRequested).toBe(true);
      await expect(page.locator(".navbar")).toBeVisible();
      await expect(page.locator(".case-study-header .banner-section")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await paint();
      expect(await page.evaluate(() => document.fonts.status)).toBe("loaded");
      expect(await page.evaluate(() => Boolean(window.gsap || window.ScrollTrigger))).toBe(false);
      firstPaint = await geometry();
    } finally {
      releaseNavigation();
    }

    await page.waitForLoadState("load");
    // A real render from the navigation controller proves the delayed script ran.
    await expect(page.locator(".navbar")).toHaveAttribute("data-journey", /\d/);
    await page.evaluate(() => document.fonts.ready);
    await paint();
    const enhanced = await geometry();
    for (const element of ["nav", "banner", "title"]) {
      for (const dimension of ["x", "y", "width", "height"]) {
        expect(Math.abs(enhanced[element][dimension] - firstPaint[element][dimension]),
          `${element}.${dimension} must not jump when the delayed navigation enhancement starts`).toBeLessThanOrEqual(.5);
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect(errors, "the GSAP failure leaves no uncaught case-page error").toEqual([]);

    const works = viewport.width < 992 ? page.locator('#primary-navigation a[href="/works"]') : page.locator('.nav-breadcrumb a[href="/works"]');
    if (viewport.width < 992) {
      await page.getByRole("button", { name: "Open navigation", exact: true }).click();
      await expect(page.locator(".menu-button")).toHaveAttribute("aria-expanded", "true");
    }
    await expect(works).toBeVisible();
    expect(await works.evaluate((link) => {
      const box = link.getBoundingClientRect();
      return link.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
    }), "the native Works link is an exposed hit target").toBe(true);
    await works.focus();
    await works.press("Enter");
    await expect(page).toHaveURL(/\/works$/);
  });
}

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  test("the expanded compact case navigation leaves the title unobstructed in document flow", async ({ page }) => {
    await page.goto("/work/raiffeisen", { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const nav = page.locator(".navbar");
    const header = page.locator(".case-study-header");
    const title = page.locator("#case-title");
    await expect(nav).toBeVisible();
    await expect(title).toBeVisible();
    const navBox = await nav.boundingBox();
    const headerBox = await header.boundingBox();
    const titleBox = await title.boundingBox();
    expect(navBox.y + navBox.height, "the permanently expanded menu reserves space above the case opening").toBeLessThanOrEqual(headerBox.y + .5);
    expect(titleBox.y, "the first case heading remains below the expanded navigation").toBeGreaterThanOrEqual(navBox.y + navBox.height);
    expect(titleBox.y + titleBox.height, "the title remains visible in the first compact viewport").toBeLessThanOrEqual(844);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    const works = page.locator('#primary-navigation a[href="/works"]');
    await expect(works).toBeVisible();
    expect(await works.evaluate((link) => {
      const box = link.getBoundingClientRect();
      return link.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
    }), "the no-JS Works link remains an exposed native target").toBe(true);
    await works.click();
    await expect(page).toHaveURL(/\/works$/);
  });
});
