import { expect, test } from "@playwright/test";

const projectCopy = {
  en: { label: "Discuss your project", title: "Opens your email app to discuss your project" },
  hu: { label: "Beszéljünk a projektedről", title: "Megnyitja a leveleződet, hogy a projektedről írhass." },
};
const contactHref = ["mai", "lto", ":"].join("") + ["anorbert", "@", "pm", ".", "me"].join("");
const routes = ["/", "/ai-integration", "/hu/ai-integracio", "/privacy", "/hu/adatvedelem"];
const viewports = [
  { width: 320, height: 720, activation: "pointer" },
  { width: 390, height: 844, activation: "Enter" },
  { width: 1280, height: 900, activation: "Space" },
];

test.use({ reducedMotion: "reduce" });

for (const viewport of viewports) {
  for (const route of routes) {
    test(`${viewport.width} ${route}: contact copy, fit and native ${viewport.activation}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const vendorRequests = [];
      await page.route(/posthog\.com/, async (request) => {
        vendorRequests.push(request.request().url());
        await request.abort();
      });
      await page.addInitScript(() => { window.contactHandoffs = []; });
      await page.route("**/assets/js/navigation.js", async (request) => {
        const response = await request.fetch();
        const source = await response.text();
        const assign = "window.location.assign(footerMailHref());";
        expect(source.split(assign)).toHaveLength(2);
        // Run the real native click handler; stub only the external app handoff.
        // No email app is opened and no email is sent by this test.
        await request.fulfill({ response, body: source.replace(assign, "window.contactHandoffs.push(footerMailHref());") });
      });
      const response = await page.goto(route);
      expect(response.status()).toBe(200);
      await page.waitForFunction(() => document.fonts.status === "loaded");
      const expectedCount = route === "/" ? 3 : 2;
      const buttons = page.locator("button.footer-email");
      await expect(buttons).toHaveCount(expectedCount);

      for (let index = 0; index < expectedCount; index += 1) {
        const button = buttons.nth(index);
        const scope = await button.evaluate((element) => ({
          main: Boolean(element.closest("main")),
          nav: Boolean(element.closest(".navbar")),
          lang: element.closest("[lang]")?.lang,
        }));
        const privacyContact = scope.main && ["/privacy", "/hu/adatvedelem"].includes(route);
        const language = scope.main && route === "/hu/ai-integracio" ? "hu" : "en";
        const label = privacyContact ? "Email" : projectCopy[language].label;
        if (scope.nav && viewport.width < 992) await page.locator(".menu-button").click();
        await expect(button).toBeVisible();
        await expect(button).toHaveText(label);
        await expect(button).toHaveAccessibleName(label);
        await expect(button).toHaveAttribute("type", "button");
        await expect(button).not.toHaveAttribute("href");
        if (privacyContact) {
          expect(await button.getAttribute("title")).toBeNull();
        } else {
          await expect(button).toHaveAttribute("title", projectCopy[language].title);
          expect(scope.lang).toBe(language);
        }
        await button.scrollIntoViewIfNeeded();
        const size = await button.evaluate((element) => {
          const box = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          const range = document.createRange();
          range.selectNodeContents(element);
          return {
            width: box.width, height: box.height, left: box.left, right: box.right,
            expected: Math.max(44, range.getBoundingClientRect().width +
              parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) +
              parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth)),
            overflow: element.scrollWidth - element.clientWidth,
          };
        });
        expect(size.height).toBe(44);
        expect(size.width).toBeGreaterThanOrEqual(44);
        expect(Math.abs(size.width - size.expected), "button width must fit its actual label").toBeLessThanOrEqual(2);
        expect(size.overflow).toBeLessThanOrEqual(1);
        expect(size.left).toBeGreaterThanOrEqual(-1);
        expect(size.right).toBeLessThanOrEqual(viewport.width + 1);
        if (viewport.activation === "pointer") await button.click();
        else {
          await button.focus();
          await page.keyboard.press(viewport.activation);
        }
        await expect.poll(() => page.evaluate(() => window.contactHandoffs.length)).toBe(index + 1);
        if (scope.nav && viewport.width < 992) {
          await expect(page.locator(".menu-button")).toHaveAttribute("aria-expanded", "false");
        }
      }

      expect(await page.evaluate(() => window.contactHandoffs)).toEqual(Array(expectedCount).fill(contactHref));
      expect(await page.content()).not.toMatch(/mailto:|anorbert@pm\.me/i);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
      expect(await page.evaluate(() => ({
        enabled: window.PortfolioAnalyticsConfig.enabled,
        consent: typeof window.PortfolioConsent,
        analytics: typeof window.PortfolioAnalyticsReady,
      }))).toEqual({ enabled: false, consent: "undefined", analytics: "undefined" });
      expect(vendorRequests).toEqual([]);
    });
  }
}
