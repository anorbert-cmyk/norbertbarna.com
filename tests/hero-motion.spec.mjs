import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 900 } });

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
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
    const targets = [...mast.querySelectorAll(".home-mast-art, .home-mast-navy, .home-mast-navy-drift")];
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
      root: translation(mast.querySelector(".home-mast-art")),
      portable: mast.getAttribute("data-mast-motion"),
      pointer: [".home-mast-navy-back", ".home-mast-navy-front"].map((selector) => translation(mast.querySelector(selector))),
      scroll: [...mast.querySelectorAll(".home-mast-navy-drift")].map(translation),
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
    window.__oldHeroTweens = gsap.getTweensOf(mast.querySelectorAll(".home-mast-art, .home-mast-navy, .home-mast-navy-drift"));
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
    expect(state.portable).toBeNull();
    for (const offset of state.pointer.concat(state.scroll, [state.root])) {
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

async function swipeHeader(page, distance) {
  await page.evaluate(() => {
    window.__heroTouchEvents = [];
    for (const type of ["touchstart", "touchmove", "touchend", "touchcancel", "pointercancel"]) {
      document.addEventListener(type, (event) => {
        window.__heroTouchEvents.push({ type, trusted: event.isTrusted });
      }, { capture: true, passive: true });
    }
  });
  const viewport = page.viewportSize();
  const x = Math.min(300, viewport.width * 0.5);
  const y = Math.min(680, viewport.height - 40);
  const session = await page.context().newCDPSession(page);
  try {
    // Dispatch actual touch input: DOM-dispatched TouchEvents have no native
    // scroll action, and the experimental gesture synthesizer was inert in CI.
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart", touchPoints: [{ x, y, id: 1 }],
    });
    for (let step = 1; step <= 24; step += 1) {
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove", touchPoints: [{ x, y: y - distance * step / 24, id: 1 }],
      });
      await page.waitForTimeout(24);
    }
    // Stop the finger before lifting so momentum cannot carry the mast offscreen.
    await page.waitForTimeout(160);
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  } finally {
    await session.detach();
  }
  const events = await page.evaluate(() => window.__heroTouchEvents);
  for (const type of ["touchstart", "touchmove", "touchend"]) {
    expect(events.some((event) => event.type === type && event.trusted), type + " must reach the page as browser input").toBe(true);
  }
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
  expect((await heroState(page)).root).toEqual(offscreen.root);

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
      await expect.poll(() => heroState(page).then((state) => state.root.y)).toBeLessThan(-10);
      const portable = await heroState(page);
      expect(portable.tweens).toBeLessThanOrEqual(1);
      expect(portable.portable).toBe("portable");
      for (const offset of portable.scroll) expect(offset).toEqual({ x: 0, y: 0 });
      for (const offset of portable.pointer) expect(Math.hypot(offset.x, offset.y)).toBeLessThan(0.05);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.mouse.move(900, 200);
    await expect.poll(() => heroState(page).then((state) => Math.abs(state.root.y))).toBeLessThan(0.1);
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
    // A real browser touch gesture must scroll the document without being captured.
    await swipeHeader(page, Math.round(start.height * 0.55));
    await expect.poll(() => heroState(page).then((state) => state.scrollY)).toBeGreaterThan(start.height * 0.35);
    await expect.poll(() => heroState(page).then((state) => state.root.y)).toBeLessThan(-15);
    await expect.poll(() => heroState(page).then((state) => state.activeTweens)).toBe(0);
    const scrolled = await heroState(page);
    const progress = Math.min(1, scrolled.scrollY / start.height);
    expect(scrolled.root.y).toBeCloseTo(-44 * progress, 0);
    expect(scrolled.portable).toBe("portable");
    for (const offset of scrolled.pointer.concat(scrolled.scroll)) expect(offset).toEqual({ x: 0, y: 0 });
    expect(scrolled.tweens).toBeLessThanOrEqual(1);
    expectStillContent(start.content, scrolled.content);
    expect(scrolled.grain).toEqual(start.grain);
    expect(scrolled.navTransform).toBe(start.navTransform);

    // Portable input never adds desktop pointer depth, even with a connected mouse.
    await page.mouse.move(width * 0.9, 160);
    await page.waitForTimeout(100);
    for (const offset of (await heroState(page)).pointer) expect(offset).toEqual({ x: 0, y: 0 });
    await page.evaluate((height) => window.scrollTo(0, height * 0.9), start.height);
    // A settled previous pose also has zero active tweens. First observe the
    // newly requested native-scroll response, then wait for that response to rest.
    await expect.poll(() => heroState(page).then((state) => state.root.y)).toBeLessThan(-35);
    await expect.poll(() => heroState(page).then((state) => state.activeTweens)).toBe(0);
    const nearEnd = await heroState(page);
    expect(nearEnd.root.y).toBeGreaterThanOrEqual(-44.1);
    expect(nearEnd.root.y).toBeLessThan(-35);

    await page.evaluate((height) => window.scrollTo(0, height + 300), start.height);
    await expect.poll(() => heroState(page).then((state) => state.activeTweens)).toBe(0);
    const offscreen = await heroState(page);
    await page.waitForTimeout(300);
    expect((await heroState(page)).scroll).toEqual(offscreen.scroll);
    expect((await heroState(page)).root).toEqual(offscreen.root);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(() => heroState(page).then((state) => Math.abs(state.root.y))).toBeLessThan(0.1);
    expectStillContent(start.content, (await heroState(page)).content);
    await page.waitForTimeout(150);
    expect((await heroState(page)).activeTweens).toBe(0);
  });
});

test.describe("portable header lifecycle", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test("native scrolling moves a compositable root while every inner SVG drawing group stays static", async ({ page }) => {
    await openHome(page);
    await expect(page.locator(".home-mast")).toHaveAttribute("data-mast-motion", "portable");
    await expect.poll(() => heroState(page).then((state) => state.activeTweens)).toBe(0);
    await page.evaluate(() => {
      const art = document.querySelector(".home-mast-art");
      window.__heroDrawingMutations = [];
      window.__heroRootWrites = 0;
      new MutationObserver((records) => {
        for (const record of records) {
          if (record.target === art && record.attributeName === "style") window.__heroRootWrites += 1;
          if (record.target.tagName.toLowerCase() === "g") {
            window.__heroDrawingMutations.push({ className: record.target.getAttribute("class"), attribute: record.attributeName });
          }
        }
      }).observe(art, { attributes: true, subtree: true });
    });
    await swipeHeader(page, 400);
    await expect.poll(() => heroState(page).then((state) => state.scrollY)).toBeGreaterThan(300);
    await expect.poll(() => heroState(page).then((state) => state.root.y)).toBeLessThan(-15);
    await expect.poll(() => heroState(page).then((state) => state.activeTweens)).toBe(0);
    const paint = await page.locator(".home-mast-art").evaluate((art) => ({
      mutations: window.__heroDrawingMutations, writes: window.__heroRootWrites,
      inlineTransform: art.style.transform, svgTransform: art.getAttribute("transform"),
      willChange: getComputedStyle(art).willChange, overflow: getComputedStyle(art).overflow,
      clip: getComputedStyle(art).clipPath,
    }));
    expect(paint.mutations, "changing inner SVG groups would restart expensive filtered rasterization").toEqual([]);
    expect(paint.writes, "the visible motion must actually update the CSS root").toBeGreaterThan(1);
    expect(paint.inlineTransform).toMatch(/^translate3d\(/);
    expect(paint.svgTransform, "the root uses CSS composition, not SVG geometry transforms").toBeNull();
    expect(paint.willChange).toContain("transform");
    expect(paint.overflow).toBe("visible");
    expect(paint.clip).toBe("inset(0px 0px -48px)");
    const state = await heroState(page);
    for (const offset of state.pointer.concat(state.scroll)) expect(offset).toEqual({ x: 0, y: 0 });
  });
  test("repeated wide-touch and reduced-motion transitions retain one scroll controller", async ({ page }) => {
    await openHome(page);
    for (const width of [1440, 390, 1440, 390]) {
      const { height } = await heroState(page);
      await page.evaluate((mastHeight) => window.scrollTo(0, mastHeight * 0.45), height);
      await expect.poll(() => heroState(page).then((state) => state.root.y)).toBeLessThan(-15);
      await rememberHeroController(page);
      await page.setViewportSize({ width, height: 844 });
      await expectOldHeroControllerRemoved(page);
      await expect.poll(() => heroState(page).then((state) => state.triggers)).toBe(1);
      expect((await heroState(page)).tweens).toBeLessThanOrEqual(1);
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
    javaScriptEnabled: fallback.javaScriptEnabled !== false });
  test("keeps the decorative layers static and the native CTA usable", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: fallback.reducedMotion || "no-preference" });
    expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(fallback.reducedMotion === "reduce");
    if (fallback.blockGsap) await page.route("**/assets/js/vendor/gsap.min.js", (route) => route.abort());
    await page.goto("/", { waitUntil: "load" });
    await expect(page.locator(".home-banner-title")).toHaveText("Product VP");
    if (fallback.javaScriptEnabled !== false) {
      await expect.poll(() => page.evaluate(() => window.PortfolioMedia?.isReduced())).toBe(fallback.reducedMotion === "reduce");
    }
    if (fallback.reducedMotion === "reduce") await expect(page.locator("html")).toHaveClass(/no-motion/);
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
  for (const offset of state.pointer.concat(state.scroll, [state.root])) expect(offset).toEqual({ x: 0, y: 0 });
  expect(state.triggers).toBe(0);
  await expect(page.locator(".hero-work-link")).toHaveAttribute("href", "/works");
});
