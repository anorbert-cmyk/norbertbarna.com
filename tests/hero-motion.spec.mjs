import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: "no-preference" });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("bn-analytics-consent-v1", JSON.stringify({
      version: 1, decision: "rejected", timestamp: Date.now(),
    }));
  });
});

async function openHome(page) {
  await page.goto("/", { waitUntil: "load" });
  await page.waitForFunction(() => !document.fonts || document.fonts.status === "loaded");
  await expect(page.locator("html")).toHaveClass(/gsap-ready/);
  await expect.poll(() => heroState(page).then((state) => state.triggers)).toBe(1);
}

async function heroState(page) {
  return page.evaluate(() => {
    const mast = document.querySelector(".home-mast");
    const targets = [...mast.querySelectorAll(".home-mast-navy, .home-mast-navy-drift")];
    const translation = (element) => {
      const transform = getComputedStyle(element).transform;
      const matrix = new DOMMatrixReadOnly(transform === "none" ? undefined : transform);
      return { x: matrix.e, y: matrix.f };
    };
    const position = (selector) => {
      const rect = document.querySelector(selector).getBoundingClientRect();
      return { x: rect.x, y: rect.y + scrollY, width: rect.width, height: rect.height };
    };
    return {
      pointer: [".home-mast-navy-back", ".home-mast-navy-front"].map((selector) => translation(mast.querySelector(selector))),
      scroll: [...mast.querySelectorAll(".home-mast-navy-drift")].map(translation),
      content: [".home-banner-title", ".home-mast-proof-chips", ".home-banner-outcomes", ".hero-work-link"].map(position),
      nav: position(".navbar .nav-wrap"),
      height: mast.offsetHeight,
      activeTweens: window.gsap ? gsap.getTweensOf(targets, true).length : 0,
      tweens: window.gsap ? gsap.getTweensOf(targets).length : 0,
      triggers: window.ScrollTrigger ? ScrollTrigger.getAll().filter((trigger) => trigger.trigger === mast).length : 0,
    };
  });
}

function expectStillContent(before, after) {
  before.forEach((rect, index) => {
    for (const axis of ["x", "y", "width", "height"]) {
      expect(Math.abs(rect[axis] - after[index][axis]), `content ${index} ${axis} does not follow decoration`).toBeLessThan(0.2);
    }
  });
}

async function hoverRight(page) {
  const mast = await page.locator(".home-mast").boundingBox();
  await page.mouse.move(mast.x + mast.width * 0.96, Math.min(500, mast.y + mast.height * 0.55));
  await expect.poll(() => heroState(page).then((state) => state.pointer[1].x)).toBeGreaterThan(19);
}

test("desktop hero responds visibly to hover and scroll without moving its content", async ({ page }) => {
  await openHome(page);
  const start = await heroState(page);
  await hoverRight(page);
  const hovered = await heroState(page);
  expect(hovered.pointer[1].x).toBeGreaterThan(hovered.pointer[0].x + 7);
  expect(Math.hypot(hovered.pointer[1].x, hovered.pointer[1].y)).toBeLessThanOrEqual(24.1);
  expectStillContent(start.content, hovered.content);
  expectStillContent([start.nav], [hovered.nav]);

  await page.evaluate((height) => window.scrollTo(0, Math.round(height * 0.6)), start.height);
  await expect.poll(() => heroState(page).then((state) => state.scroll[1].y)).toBeGreaterThan(30);
  await expect.poll(() => heroState(page).then((state) => state.activeTweens)).toBe(0);
  const scrolled = await heroState(page);
  expect(scrolled.scroll[1].y).toBeLessThan(36);
  expect(scrolled.scroll[1].y).toBeGreaterThan(scrolled.scroll[0].y + 10);
  expectStillContent(start.content, scrolled.content);

  // Changing pointer direction while partially scrolled must preserve scroll depth.
  await page.mouse.move(90, 150);
  await expect.poll(() => heroState(page).then((state) => state.pointer[1].x)).toBeLessThan(-17);
  const combined = await heroState(page);
  expect(combined.scroll[1].y).toBeCloseTo(scrolled.scroll[1].y, 1);
  expectStillContent(start.content, combined.content);

  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => heroState(page).then((state) => state.scroll[1].y)).toBeLessThan(0.1);
});

test("hero motion settles at rest and pauses its decorative tweens offscreen", async ({ page }) => {
  await openHome(page);
  await expect.poll(() => heroState(page).then((state) => state.activeTweens)).toBe(0);
  await hoverRight(page);
  const { height } = await heroState(page);
  await page.evaluate((mastHeight) => window.scrollTo(0, mastHeight * 0.5), height);
  await expect.poll(() => heroState(page).then((state) => state.scroll[1].y)).toBeGreaterThan(24);
  await page.evaluate((mastHeight) => window.scrollTo(0, mastHeight + 300), height);
  await expect.poll(() => heroState(page).then((state) => Math.hypot(state.pointer[1].x, state.pointer[1].y))).toBeLessThan(0.1);
  await expect.poll(() => heroState(page).then((state) => state.activeTweens)).toBe(0);
  const offscreen = await heroState(page);
  await page.waitForTimeout(400);
  expect((await heroState(page)).scroll).toEqual(offscreen.scroll);

  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => heroState(page).then((state) => state.scroll[1].y)).toBeLessThan(0.1);
  await hoverRight(page);
});

test("hero controller cleans up and resumes across repeated reduced-motion and breakpoint changes", async ({ page }) => {
  await openHome(page);
  for (const mode of ["reduce", "breakpoint", "reduce", "breakpoint"]) {
    await hoverRight(page);
    const { height } = await heroState(page);
    await page.evaluate((mastHeight) => window.scrollTo(0, mastHeight * 0.4), height);
    await expect.poll(() => heroState(page).then((state) => state.scroll[1].y)).toBeGreaterThan(18);

    if (mode === "reduce") await page.emulateMedia({ reducedMotion: "reduce" });
    else await page.setViewportSize({ width: 991, height: 900 });
    // SVG computed styles can settle one frame after the JS registry is cleared.
    // Wait for the complete rendered cleanup, keeping every teardown assertion.
    let stopped;
    await expect(async () => {
      stopped = await heroState(page);
      expect(stopped.triggers).toBe(0);
      expect(stopped.tweens, "the old controller retains no animated SVG targets").toBe(0);
      for (const offset of stopped.pointer.concat(stopped.scroll)) {
        expect(Math.hypot(offset.x, offset.y), `${mode} clears all decorative transforms`).toBeLessThan(0.05);
      }
    }).toPass({ timeout: 2000 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.mouse.move(900, 200);
    await page.waitForTimeout(100);
    expect((await heroState(page)).scroll).toEqual(stopped.scroll);

    if (mode === "reduce") await page.emulateMedia({ reducedMotion: "no-preference" });
    else await page.setViewportSize({ width: 1440, height: 900 });
    await expect.poll(() => heroState(page).then((state) => state.triggers)).toBe(1);
    // Leaving before re-entry guarantees a real pointermove after each restart.
    await page.mouse.move(1, 1);
  }
  await hoverRight(page);
});

test("unavailable GSAP leaves both hover and scroll layers static and the CTA usable", async ({ page }) => {
  await page.route("**/assets/js/vendor/gsap.min.js", (route) => route.abort());
  await page.goto("/", { waitUntil: "load" });
  await expect(page.locator(".home-banner-title")).toHaveText("Product VP");
  await page.mouse.move(1340, 450);
  const { height } = await heroState(page);
  await page.evaluate((mastHeight) => window.scrollTo(0, mastHeight * 0.4), height);
  const state = await heroState(page);
  for (const offset of state.pointer.concat(state.scroll)) expect(offset).toEqual({ x: 0, y: 0 });
  expect(state.triggers).toBe(0);
  await expect(page.locator(".hero-work-link")).toHaveAttribute("href", "/works");
});
