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
    const svgMatrix = mast.querySelector(".home-mast-art").getScreenCTM();
    const screenScale = Math.hypot(svgMatrix.c, svgMatrix.d);
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
      scrollPixels: [...mast.querySelectorAll(".home-mast-navy-drift")].map((element) => translation(element).y * screenScale),
      content: [".hero-kicker", ".home-banner-title", ".home-banner-subtitle", ".home-mast-proof-chips", ".home-banner-outcomes", ".hero-work-link"].map(position),
      nav: position(".navbar .nav-wrap"),
      navTransform: getComputedStyle(document.querySelector(".navbar .nav-wrap")).transform,
      grain: ["::before", "::after"].map((pseudo) => {
        const style = getComputedStyle(mast.querySelector(".home-mast-mesh"), pseudo);
        return [style.transform, style.backgroundPosition, style.backgroundSize, style.opacity];
      }),
      height: mast.offsetHeight,
      scrollY,
      activeTweens: window.gsap ? gsap.getTweensOf(targets, true).length : 0,
      tweens: window.gsap ? gsap.getTweensOf(targets).length : 0,
      triggers: window.ScrollTrigger ? ScrollTrigger.getAll().filter((trigger) => trigger.trigger === mast).length : 0,
    };
  });
}

async function rememberHeroController(page) {
  await page.evaluate(() => {
    const mast = document.querySelector(".home-mast");
    window.__oldHeroTweens = gsap.getTweensOf(mast.querySelectorAll(".home-mast-navy, .home-mast-navy-drift"));
    window.__oldHeroTriggers = ScrollTrigger.getAll().filter((trigger) => trigger.trigger === mast);
  });
}

async function expectOldHeroControllerRemoved(page) {
  await expect.poll(() => page.evaluate(() => {
    const tweens = gsap.globalTimeline.getChildren(true, true, true);
    const triggers = ScrollTrigger.getAll();
    return window.__oldHeroTweens.every((tween) => !tweens.includes(tween)) &&
      window.__oldHeroTriggers.every((trigger) => !triggers.includes(trigger));
  })).toBe(true);
}

async function expectStaticHero(page) {
  // SVG computed styles may settle one frame after the JS registry is cleared.
  await expect(async () => {
    const state = await heroState(page);
    expect(state.triggers).toBe(0);
    expect(state.tweens, "the old controller retains no animated SVG targets").toBe(0);
    for (const offset of state.pointer.concat(state.scroll)) {
      expect(Math.hypot(offset.x, offset.y), "static mode clears every decorative transform").toBeLessThan(0.05);
    }
  }).toPass({ timeout: 2000 });
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
    await rememberHeroController(page);

    if (mode === "reduce") await page.emulateMedia({ reducedMotion: "reduce" });
    else await page.setViewportSize({ width: 991, height: 900 });
    await expectOldHeroControllerRemoved(page);
    if (mode === "reduce") await expectStaticHero(page);
    else {
      await expect.poll(() => heroState(page).then((state) => state.triggers)).toBe(1);
      await expect.poll(() => heroState(page).then((state) => state.scrollPixels[1])).toBeLessThan(-10);
      const portable = await heroState(page);
      expect(portable.tweens).toBeLessThanOrEqual(2);
      for (const offset of portable.pointer) expect(Math.hypot(offset.x, offset.y)).toBeLessThan(0.05);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.mouse.move(900, 200);
    await expect.poll(() => heroState(page).then((state) => Math.abs(state.scrollPixels[1]))).toBeLessThan(0.1);
    for (const offset of (await heroState(page)).pointer) expect(Math.hypot(offset.x, offset.y)).toBeLessThan(0.05);

    if (mode === "reduce") await page.emulateMedia({ reducedMotion: "no-preference" });
    else {
      await rememberHeroController(page);
      await page.setViewportSize({ width: 1440, height: 900 });
      await expectOldHeroControllerRemoved(page);
    }
    await expect.poll(() => heroState(page).then((state) => state.triggers)).toBe(1);
    // Leaving before re-entry guarantees a real pointermove after each restart.
    await page.mouse.move(1, 1);
  }
  await hoverRight(page);
});

for (const width of [390, 1440]) test.describe(width + " touch header", () => {
  test.use({ viewport: { width, height: 844 }, hasTouch: true, isMobile: true });
  test("native touch scroll gives visible bounded depth, keeps reading content still, and returns to rest", async ({ page }) => {
    await openHome(page);
    expect(await page.evaluate(() => matchMedia("(pointer: coarse)").matches)).toBe(true);
    const start = await heroState(page);
    const session = await page.context().newCDPSession(page);
    // A real browser touch gesture must scroll the document without being captured.
    await session.send("Input.synthesizeScrollGesture", {
      x: Math.min(300, width * 0.5), y: 680, yDistance: -Math.round(start.height * 0.55),
      gestureSourceType: "touch", preventFling: true, speed: 900,
    });
    await session.detach();
    await expect.poll(() => heroState(page).then((state) => state.scrollY)).toBeGreaterThan(start.height * 0.35);
    await expect.poll(() => heroState(page).then((state) => state.scrollPixels[1])).toBeLessThan(-15);
    await expect.poll(() => heroState(page).then((state) => state.activeTweens)).toBe(0);
    const scrolled = await heroState(page);
    const progress = Math.min(1, scrolled.scrollY / start.height);
    expect(scrolled.scrollPixels[0]).toBeCloseTo(-28 * progress, 0);
    expect(scrolled.scrollPixels[1]).toBeCloseTo(-44 * progress, 0);
    expect(scrolled.scrollPixels[0] - scrolled.scrollPixels[1]).toBeGreaterThan(5);
    expect(scrolled.tweens).toBeLessThanOrEqual(2);
    expectStillContent(start.content, scrolled.content);
    expect(scrolled.grain).toEqual(start.grain);
    expect(scrolled.navTransform).toBe(start.navTransform);

    // Portable input never adds desktop pointer depth, even with a connected mouse.
    await page.mouse.move(width * 0.9, 160);
    await page.waitForTimeout(100);
    for (const offset of (await heroState(page)).pointer) expect(offset).toEqual({ x: 0, y: 0 });
    await page.evaluate((height) => window.scrollTo(0, height * 0.9), start.height);
    await expect.poll(() => heroState(page).then((state) => state.activeTweens)).toBe(0);
    const nearEnd = await heroState(page);
    expect(nearEnd.scrollPixels[0]).toBeGreaterThanOrEqual(-28.1);
    expect(nearEnd.scrollPixels[1]).toBeGreaterThanOrEqual(-44.1);
    expect(nearEnd.scrollPixels[1]).toBeLessThan(-35);

    await page.evaluate((height) => window.scrollTo(0, height + 300), start.height);
    await expect.poll(() => heroState(page).then((state) => state.activeTweens)).toBe(0);
    const offscreen = await heroState(page);
    await page.waitForTimeout(300);
    expect((await heroState(page)).scroll).toEqual(offscreen.scroll);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(() => heroState(page).then((state) => Math.abs(state.scrollPixels[1]))).toBeLessThan(0.1);
    expectStillContent(start.content, (await heroState(page)).content);
    await page.waitForTimeout(150);
    expect((await heroState(page)).activeTweens).toBe(0);
  });
});

test.describe("portable header lifecycle", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test("repeated wide-touch and reduced-motion transitions retain one scroll controller", async ({ page }) => {
    await openHome(page);
    for (const width of [1440, 390, 1440, 390]) {
      const { height } = await heroState(page);
      await page.evaluate((mastHeight) => window.scrollTo(0, mastHeight * 0.45), height);
      await expect.poll(() => heroState(page).then((state) => state.scrollPixels[1])).toBeLessThan(-15);
      await rememberHeroController(page);
      await page.setViewportSize({ width, height: 844 });
      await expectOldHeroControllerRemoved(page);
      await expect.poll(() => heroState(page).then((state) => state.triggers)).toBe(1);
      expect((await heroState(page)).tweens).toBeLessThanOrEqual(2);
      await rememberHeroController(page);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await expectOldHeroControllerRemoved(page);
      await expectStaticHero(page);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await expect.poll(() => heroState(page).then((state) => state.triggers)).toBe(1);
      for (const offset of (await heroState(page)).pointer) expect(offset).toEqual({ x: 0, y: 0 });
    }
  });
});

for (const fallback of [
  { name: "reduced motion", reducedMotion: "reduce" },
  { name: "unavailable GSAP", blockGsap: true },
  { name: "no JavaScript", javaScriptEnabled: false },
]) test.describe("mobile header fallback: " + fallback.name, () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true,
    reducedMotion: fallback.reducedMotion || "no-preference", javaScriptEnabled: fallback.javaScriptEnabled !== false });
  test("keeps the decorative layers static and the native CTA usable", async ({ page }) => {
    if (fallback.blockGsap) await page.route("**/assets/js/vendor/gsap.min.js", (route) => route.abort());
    await page.goto("/", { waitUntil: "load" });
    await expect(page.locator(".home-banner-title")).toHaveText("Product VP");
    const { height } = await heroState(page);
    await page.evaluate((mastHeight) => window.scrollTo(0, mastHeight * 0.5), height);
    await expectStaticHero(page);
    await page.locator(".hero-work-link").tap();
    await expect(page).toHaveURL(/\/works$/);
  });
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
