import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("nb-arrival-seen-v2", "1");
    localStorage.setItem("bn-analytics-consent-v1", JSON.stringify({ version: 1, decision: "rejected", timestamp: Date.now() }));
  });
});

async function openHome(page) {
  await page.goto("/", { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("h1")).toHaveText("Product VP");
}

async function finishNativeTrack(page) {
  await page.locator(".home-mast-track").evaluate((track) => {
    const box = track.getBoundingClientRect();
    const scene = track.querySelector(".home-mast-scene").getBoundingClientRect();
    scrollTo(0, box.top + scrollY + Math.max(0, box.height - scene.height));
  });
  await expect(page.locator(".home-mast-intro")).toHaveCSS("opacity", "1");
  await expect(page.locator(".home-intro-work")).not.toHaveAttribute("tabindex", "-1");
}

async function readingState(page) {
  return page.evaluate(() => {
    const rect = (selector) => document.querySelector(selector).getBoundingClientRect().toJSON();
    const title = document.querySelector(".home-mast-display");
    let alpha = 1;
    for (let node = title; node; node = node.parentElement) alpha *= Number(getComputedStyle(node).opacity);
    return {
      title: rect(".home-mast-display"), copy: rect(".home-banner-subtitle"), action: rect(".home-intro-work"),
      intro: rect(".home-mast-intro"), stage: rect(".home-mast-scene"),
      track: rect(".home-mast-track"), work: rect("#works"),
      titleAlpha: alpha, titleVisibility: getComputedStyle(title).visibility,
      overflow: document.documentElement.scrollWidth - innerWidth,
    };
  });
}

test("desktop native scroll resolves the split Product VP composition and releases directly into Selected work", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openHome(page);
  await expect(page.locator(".home-mast")).toHaveAttribute("data-morph-active", "");
  await expect(page.locator(".home-mast-display")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(".home-banner-title")).toBeInViewport();
  await expect.poll(() => page.evaluate(() => window.PortfolioHeroScene?.status)).toBe("ready");
  await page.evaluate(() => window.PortfolioHeroScene.finish());
  const canvas = page.locator(".home-mast-canvas");
  const paint = async () => createHash("sha256").update(await canvas.screenshot()).digest("hex");
  const centeredPaint = await paint();
  const initial = await readingState(page);
  expect(initial.track.height).toBeGreaterThan(initial.stage.height);
  expect(initial.titleAlpha).toBeLessThan(.05);
  await page.mouse.wheel(0, 450);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(300);
  await finishNativeTrack(page);
  const split = await readingState(page);
  expect(await paint(), "native scroll changes the painted form after its arrival assembly has finished").not.toBe(centeredPaint);
  expect(split.titleAlpha).toBeGreaterThan(.99);
  expect(split.titleVisibility).toBe("visible");
  expect(split.title.left).toBeLessThan(1440 * .15);
  expect(split.title.right, "the role leaves the right side for the folded form").toBeLessThan(1440 * .6);
  expect(split.copy.right).toBeLessThan(1440 * .55);
  expect(split.action.top).toBeGreaterThanOrEqual(split.copy.bottom);
  expect(split.track.height).toBe(initial.track.height);
  expect(split.overflow).toBeLessThanOrEqual(1);
  expect(split.work.top, "no About or spacer chapter separates the hero from its work").toBeLessThanOrEqual(split.track.bottom + 2);
  expect(split.work.top).toBeGreaterThanOrEqual(split.track.bottom - 2);
  await page.mouse.wheel(0, 600);
  await expect(page.locator("#works .work-row").first()).toBeInViewport();
  await expect(page.locator("#works .about-section-title")).toHaveText("Selected work");
});

for (const width of [320, 390]) {
  test(`${width}: the split scene and landscape work rows remain readable and the first project tap navigates`, async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width, height: 844 }, hasTouch: true, isMobile: true });
    await page.addInitScript(() => {
      sessionStorage.setItem("nb-arrival-seen-v2", "1");
      localStorage.setItem("bn-analytics-consent-v1", JSON.stringify({ version: 1, decision: "rejected", timestamp: Date.now() }));
    });
    try {
      await openHome(page);
      await finishNativeTrack(page);
      const state = await readingState(page);
      expect(state.titleAlpha).toBeGreaterThan(.99);
      expect(state.overflow).toBeLessThanOrEqual(1);
      for (const [label, box] of Object.entries({ title: state.title, copy: state.copy, action: state.action })) {
        expect(box.width, label).toBeGreaterThan(0);
        expect(box.left, label).toBeGreaterThanOrEqual(0);
        expect(box.right, label).toBeLessThanOrEqual(width);
      }
      const row = page.locator("#works .work-row").first();
      await row.scrollIntoViewIfNeeded();
      const geometry = await row.evaluate((element) => {
        const row = element.getBoundingClientRect();
        const frame = element.querySelector(".work-row-visual").getBoundingClientRect();
        const copy = element.querySelector(".work-row-copy").getBoundingClientRect();
        const image = element.querySelector(".work-row-thumb");
        return { rowWidth: row.width, frame: frame.toJSON(), copyTop: copy.top,
          fit: getComputedStyle(image).objectFit, complete: image.complete && image.naturalWidth > 0 };
      });
      expect(geometry.frame.width).toBeGreaterThan(geometry.rowWidth * .8);
      expect(geometry.frame.width / geometry.frame.height).toBeGreaterThan(1.5);
      expect(geometry.copyTop).toBeGreaterThanOrEqual(geometry.frame.bottom);
      expect(geometry.fit).toBe("contain");
      expect(geometry.complete).toBe(true);
      await expect(row.locator("a")).toHaveCount(1);
      const bounds = await row.boundingBox();
      await row.tap({ position: { x: bounds.width - 8, y: bounds.height / 2 } });
      await expect(page).toHaveURL(/\/work\/raiffeisen$/);
    } finally { await page.close(); }
  });
}

test("reduced motion uses the complete unpinned composition and a live preference change restores it", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openHome(page);
  await expect(page.locator(".home-mast")).not.toHaveAttribute("data-morph-active");
  await expect(page.locator(".home-mast-display")).toBeVisible();
  await expect(page.locator(".home-mast-gate-fallback")).toBeVisible();
  await expect(page.locator(".home-mast-gate-fallback")).toHaveCSS("opacity", "1");
  await expect(page.locator(".home-mast-fallback")).toBeHidden();
  await expect(page.locator(".home-mast-canvas")).toBeHidden();
  await expect(page.locator(".home-mast-intro")).toHaveCSS("opacity", "1");
  const before = await readingState(page);
  expect(before.titleAlpha).toBeGreaterThan(.99);
  expect(before.track.height).toBeLessThanOrEqual(before.stage.height + 1);
  await page.mouse.wheel(0, 250);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(100);
  const after = await readingState(page);
  expect(after.title.top).toBeLessThan(before.title.top - 100);
  expect(after.title.width).toBe(before.title.width);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator(".home-mast")).toHaveAttribute("data-morph-active", "");
  await finishNativeTrack(page);
  const action = page.locator(".home-intro-work");
  await action.focus();
  const focusedTop = (await action.boundingBox()).y;
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".home-mast")).not.toHaveAttribute("data-morph-active");
  await expect(page.locator(".home-mast-intro")).toHaveCSS("opacity", "1");
  await expect(page.locator(".home-intro-work")).not.toHaveAttribute("tabindex", "-1");
  await expect(action).toBeFocused();
  await expect.poll(async () => Math.abs((await action.boundingBox()).y - focusedTop),
    { message: "switching to native flow preserves the focused action's reading position" }).toBeLessThanOrEqual(3);
  expect((await readingState(page)).overflow).toBeLessThanOrEqual(1);
});

test("the native introduction anchor survives a case visit and restores the visitor's actual scroll position", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openHome(page);
  await page.locator(".home-mast-scroll").click();
  await expect(page).toHaveURL(/#home-introduction$/);
  await expect(page.locator(".home-mast-intro")).toHaveCSS("opacity", "1");
  const project = page.locator("#works .work-title").first();
  await project.scrollIntoViewIfNeeded();
  const previousScroll = await page.evaluate(() => scrollY);
  await project.click();
  await expect(page).toHaveURL(/\/work\/raiffeisen$/);
  await page.goBack();
  await expect(page).toHaveURL(/#home-introduction$/);
  await expect.poll(() => page.evaluate((previous) => Math.abs(scrollY - previous), previousScroll)).toBeLessThanOrEqual(1);
  await expect(project).toBeInViewport();
});
