import { expect, test } from "@playwright/test";

test.use({ contextOptions: { reducedMotion: "reduce" } });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("bn-analytics-consent-v1", JSON.stringify({ version: 1, decision: "rejected", timestamp: Date.now() }));
  });
});

const routes = [
  { path: "/", controls: [{ selector: ".home-intro-work", name: "View selected work", href: "/works" }] },
  { path: "/hu", controls: [{ selector: ".home-intro-work", name: "Válogatott munkáim", href: "/hu/munkak" }] },
  { path: "/about", controls: [
    { selector: ".story-perspective .story-text-link", name: "Explore the work", href: "/works" },
    { selector: '.story-next a.story-text-link[href="/works"]', name: "View works", href: "/works" },
    // The closing contact action is a native link to the contact form (owner, 2026-10-06).
    { selector: ".story-next a.footer-email", name: "Get in touch", href: "/contact", link: true },
    { selector: ".story-footer-top a[target='_blank']", name: "Find me on LinkedIn (opens in a new tab)", href: "https://www.linkedin.com/in/barna-norbert/" },
  ] },
  { path: "/hu/rolam", controls: [
    { selector: ".story-perspective .story-text-link", name: "Nézd meg a munkáimat", href: "/hu/munkak" },
    { selector: '.story-next a.story-text-link[href="/hu/munkak"]', name: "Munkáim", href: "/hu/munkak" },
    { selector: ".story-next a.footer-email", name: "Írj nekem", href: "/hu/kapcsolat", link: true },
    { selector: ".story-footer-top a[target='_blank']", name: "LinkedIn-profilom (új lapon nyílik meg)", href: "https://www.linkedin.com/in/barna-norbert/" },
  ] },
];

for (const viewport of [{ width: 320, height: 720 }, { width: 1366, height: 900 }]) {
  for (const route of routes) {
    test(`${route.path} action icons remain monochrome, decorative and readable at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const response = await page.goto(route.path);
      expect(response.status()).toBe(200);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator("button.footer-email")).toHaveCount(0);
      for (const { selector, name, href, link } of route.controls) {
        const control = page.locator(selector);
        await expect(control).toHaveCount(1);
        await expect(control).toHaveAccessibleName(name);
        if (href) await expect(control).toHaveAttribute("href", href);
        if (link) {
          await expect(control).toHaveJSProperty("tagName", "A");
          expect(await control.getAttribute("type")).toBeNull();
          expect(await control.getAttribute("title")).toBeNull();
        }
        await control.scrollIntoViewIfNeeded();
        const icon = control.locator("svg.link-icon");
        await expect(icon).toBeVisible();
        await expect(icon).toHaveAttribute("aria-hidden", "true");
        await expect(icon).toHaveAttribute("focusable", "false");
        const geometry = await icon.evaluate((element) => {
          const owner = element.closest("a, button");
          const box = element.getBoundingClientRect();
          const ownerBox = owner.getBoundingClientRect();
          const shapes = [...element.querySelectorAll("path, rect")];
          return {
            width: box.width, height: box.height, ownerHeight: ownerBox.height,
            left: ownerBox.left, right: ownerBox.right,
            within: box.left >= ownerBox.left && box.right <= ownerBox.right,
            ink: getComputedStyle(owner).color,
            paint: shapes.map((shape) => {
              const style = getComputedStyle(shape);
              return style.stroke === "none" ? style.fill : style.stroke;
            }),
            tabIndex: element.getAttribute("tabindex"),
          };
        });
        expect(geometry.width).toBe(18);
        expect(geometry.height).toBe(18);
        expect(geometry.ownerHeight).toBeGreaterThanOrEqual(44);
        expect(geometry.left).toBeGreaterThanOrEqual(-1);
        expect(geometry.right).toBeLessThanOrEqual(viewport.width + 1);
        expect(geometry.within).toBe(true);
        expect(geometry.paint.every((ink) => ink === geometry.ink)).toBe(true);
        expect(geometry.tabIndex).toBeNull();
        await control.focus();
        await expect(control).toBeFocused();
      }
      expect(await page.locator("body").innerText()).not.toMatch(/[\u2197\u279a\u2b08]/);
    });
  }
}
