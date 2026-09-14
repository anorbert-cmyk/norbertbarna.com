import { expect, test } from "@playwright/test";

for (const mode of ["mouse navigation", "touch CTA"]) {
  test.describe(mode, () => {
    test.use(mode === "touch CTA" ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 900 } });
    test("the dismissing gesture cannot activate the covered destination, but the next gesture can", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.addInitScript(() => {
        sessionStorage.removeItem("nb-arrival-seen-v2");
        localStorage.setItem("bn-analytics-consent-v1", JSON.stringify({ version: 1, decision: "rejected", timestamp: Date.now() }));
        window.__pointerArrivalEnds = [];
        window.addEventListener("portfolio:arrivalend", (event) => window.__pointerArrivalEnds.push(event.detail.reason));
      });
      const workNavigations = [];
      page.on("request", (request) => {
        if (request.isNavigationRequest() && new URL(request.url()).pathname === "/works") workNavigations.push(request.url());
      });
      await page.goto("/", { waitUntil: "domcontentloaded" });
      const originalURL = page.url();
      await expect(page.locator(".site-arrival")).toBeVisible();
      // Cover both the initial assembly and the ready-to-enter curtain.
      if (mode === "touch CTA") await expect(page.getByRole("button", { name: "Enter the portfolio" })).toBeVisible({ timeout: 8000 });
      const destination = page.locator(mode === "touch CTA" ? ".hero-work-link" : '.navbar a[href="/works"]');
      const box = await destination.boundingBox();
      expect(box.width).toBeGreaterThan(0);
      expect(box.height).toBeGreaterThan(0);
      const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      expect(point.x).toBeGreaterThan(0);
      expect(point.y).toBeGreaterThan(0);
      expect(point.y).toBeLessThan(page.viewportSize().height);
      // Coordinates deliberately target the obscured destination. A locator
      // click would wait for the curtain to disappear and miss this regression.
      if (mode === "touch CTA") await page.touchscreen.tap(point.x, point.y);
      else await page.mouse.click(point.x, point.y);
      await expect(page.locator(".site-arrival")).toHaveCount(0);
      await expect(page).toHaveURL(originalURL);
      expect(workNavigations, "the skip gesture sends no navigation to the obscured destination").toEqual([]);
      expect(await page.evaluate(() => window.__pointerArrivalEnds)).toEqual(["pointer"]);
      expect(await destination.evaluate((link) => {
        const r = link.getBoundingClientRect();
        return link.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
      }), "after dismissal the destination is exposed to intentional input").toBe(true);
      if (mode === "touch CTA") await destination.tap();
      else await destination.click();
      await expect(page).toHaveURL(/\/works$/);
      expect(workNavigations, "one subsequent intentional gesture navigates exactly once").toHaveLength(1);
    });
  });
}
