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
  const portable = (await heroState(page)).portableViewport;
  await expect.poll(() => heroState(page).then((state) => state.triggers)).toBe(portable ? 0 : 1);
}

async function heroState(page) {
  return page.evaluate(() => {
    const mast = document.querySelector(".home-mast");
    const art = mast.querySelector(".home-mast-art");
    const mastRect = mast.getBoundingClientRect();
    const artStyle = getComputedStyle(art);
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
      root: translation(art),
      portable: mast.getAttribute("data-mast-motion"),
      portableViewport: matchMedia("(max-width: 991px), (hover: none), (pointer: coarse)").matches,
      supportsNative: CSS.supports("view-timeline-name: --home-mast-scroll") &&
        CSS.supports("animation-timeline: --home-mast-scroll") &&
        CSS.supports("animation-range: exit-crossing 0% exit-crossing 100%"),
      progress: Math.max(0, Math.min(1, -mastRect.top / mastRect.height)),
      mastTop: mastRect.top,
      viewportHeight: innerHeight,
      inlineTransform: art.style.transform,
      svgTransform: art.getAttribute("transform"),
      css: art.getAnimations().map((animation) => ({
        type: animation.constructor.name, name: animation.animationName,
        viewTimeline: typeof ViewTimeline === "function" && animation.timeline instanceof ViewTimeline,
        subjectIsMast: animation.timeline?.subject === mast,
        axis: animation.timeline?.axis,
        rangeStart: { name: animation.rangeStart?.rangeName, offset: String(animation.rangeStart?.offset) },
        rangeEnd: { name: animation.rangeEnd?.rangeName, offset: String(animation.rangeEnd?.offset) },
        progress: animation.effect.getComputedTiming().progress,
      })),
      cssDuration: artStyle.animationDuration,
      cssEasing: artStyle.animationTimingFunction,
      cssFill: artStyle.animationFillMode,
      timelineInset: getComputedStyle(mast).viewTimelineInset,
      pointer: [".home-mast-navy-back", ".home-mast-navy-front"].map((selector) => translation(mast.querySelector(selector))),
      scroll: [...mast.querySelectorAll(".home-mast-navy-drift")].map(translation),
      content: [".hero-kicker", ".home-banner-title", ".home-banner-subtitle", ".home-mast-proof-chips", ".home-banner-outcomes", ".hero-work-link"].map(position),
      nav: position(".navbar .nav-wrap"),
      navTransform: getComputedStyle(document.querySelector(".navbar .nav-wrap")).transform,
      grain: ["::before", "::after"].map((pseudo) => {
        const style = getComputedStyle(mast.querySelector(".home-mast-mesh"), pseudo);
        return [style.transform, style.backgroundPosition, style.backgroundSize, style.opacity];
      }),
      height: mastRect.height,
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
    expect(state.css, "static mode has no CSS animation either").toEqual([]);
    expect(state.portable).toBeNull();
    expect(state.inlineTransform).toBe("");
    for (const offset of state.pointer.concat(state.scroll, [state.root])) {
      expect(Math.hypot(offset.x, offset.y), "static mode clears every decorative transform").toBeLessThan(0.05);
    }
  }).toPass({ timeout: 2000 });
}

async function nextRenderedFrame(page) {
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function expectNativeHero(page, { javaScriptEnabled = true } = {}) {
  // View timelines update during rendering. Two frames allow that update, but
  // deliberately do not wait through the former 0.48s JavaScript easing.
  if (javaScriptEnabled) await nextRenderedFrame(page);
  // Disabled page JavaScript also suppresses injected rAF callbacks. Give the
  // browser its rendering interval while CSS continues without script execution.
  else await page.waitForTimeout(50);
  const state = await heroState(page);
  expect(state.supportsNative).toBe(true);
  expect(state.portable).toBeNull();
  expect(state.triggers, "portable hero creates no GSAP ScrollTrigger").toBe(0);
  expect(state.tweens, "portable hero creates no GSAP tween").toBe(0);
  expect(state.activeTweens).toBe(0);
  expect(state.inlineTransform, "CSS owns the root transform").toBe("");
  expect(state.svgTransform).toBeNull();
  expect(state.css).toHaveLength(1);
  expect(state.css[0]).toMatchObject({
    type: "CSSAnimation", name: "home-mast-native-depth", viewTimeline: true,
    subjectIsMast: true, axis: "block",
    rangeStart: { name: "exit-crossing", offset: "0%" },
    rangeEnd: { name: "exit-crossing", offset: "100%" },
  });
  expect(state.cssDuration).toBe("auto");
  expect(state.cssEasing).toBe("linear");
  expect(state.cssFill).toBe("both");
  expect(state.timelineInset).toBe("0px");
  expect(state.css[0].progress).toBeCloseTo(state.progress, 3);
  expect(state.root.x).toBeCloseTo(0, 2);
  expect(Math.abs(state.root.y + 44 * state.progress), "depth tracks the actual mast range without time-based lag").toBeLessThan(0.15);
  for (const offset of state.pointer.concat(state.scroll)) expect(offset).toEqual({ x: 0, y: 0 });
  return state;
}

async function scrollMastTo(page, progress) {
  await page.evaluate((fraction) => {
    const rect = document.querySelector(".home-mast").getBoundingClientRect();
    window.scrollTo(0, window.scrollY + rect.top + rect.height * fraction);
  }, progress);
  return expectNativeHero(page);
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

async function swipeHeader(page, distance, { javaScriptEnabled = true } = {}) {
  if (javaScriptEnabled) await page.evaluate(() => {
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
  // JavaScript-disabled pages cannot execute these observer callbacks. The
  // same native CDP input still has to produce the asserted document scroll.
  if (javaScriptEnabled) {
    const events = await page.evaluate(() => window.__heroTouchEvents);
    for (const type of ["touchstart", "touchmove", "touchend"]) {
      expect(events.some((event) => event.type === type && event.trusted), type + " must reach the page as browser input").toBe(true);
    }
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
      const portable = await expectNativeHero(page);
      expect(portable.root.y).toBeLessThan(-10);
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
    expect((await heroState(page)).css).toEqual([]);
    // Leaving before re-entry guarantees a real pointermove after each restart.
    await page.mouse.move(1, 1);
  }
  await hoverRight(page);
});

for (const width of [390, 1440]) test.describe(width + " touch header", () => {
  test.use({ viewport: { width, height: 844 }, hasTouch: true, isMobile: true });
  test("native touch scroll gives visible bounded CSS depth, keeps reading content still, and returns to rest", async ({ page }) => {
    await openHome(page);
    expect(await page.evaluate(() => matchMedia("(pointer: coarse)").matches)).toBe(true);
    const start = await expectNativeHero(page);
    // A real browser touch gesture must scroll the document without being captured.
    await swipeHeader(page, Math.round(start.height * 0.55));
    await expect.poll(() => heroState(page).then((state) => state.scrollY)).toBeGreaterThan(start.height * 0.35);
    const scrolled = await expectNativeHero(page);
    expect(scrolled.root.y).toBeLessThan(-15);
    expectStillContent(start.content, scrolled.content);
    expect(scrolled.grain).toEqual(start.grain);
    expect(scrolled.navTransform).toBe(start.navTransform);

    // Portable input never adds desktop pointer depth, even with a connected mouse.
    await page.mouse.move(width * 0.9, 160);
    await expectNativeHero(page);
    const nearEnd = await scrollMastTo(page, 0.9);
    expect(nearEnd.root.y).toBeGreaterThanOrEqual(-44.1);
    expect(nearEnd.root.y).toBeLessThan(-35);

    const offscreen = await scrollMastTo(page, 1.3);
    expect(offscreen.root.y).toBeCloseTo(-44, 2);
    await page.waitForTimeout(300);
    expect((await heroState(page)).root).toEqual(offscreen.root);
    const returned = await scrollMastTo(page, 0);
    expect(Math.abs(returned.root.y)).toBeLessThan(0.1);
    expectStillContent(start.content, returned.content);
    await page.waitForTimeout(150);
    expect((await heroState(page)).activeTweens).toBe(0);
  });
});

test.describe("portable header lifecycle", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test("native CSS scrolling moves the root without any root or inner SVG attribute writes", async ({ page }) => {
    await openHome(page);
    const start = await expectNativeHero(page);
    await page.evaluate(() => {
      const art = document.querySelector(".home-mast-art");
      window.__heroDrawingMutations = [];
      window.__heroDrawingObserver = new MutationObserver((records) => {
        for (const record of records) {
          window.__heroDrawingMutations.push({ tag: record.target.tagName, attribute: record.attributeName });
        }
      });
      window.__heroDrawingObserver.observe(art, { attributes: true, subtree: true });
    });
    await swipeHeader(page, 400);
    await expect.poll(() => heroState(page).then((state) => state.scrollY)).toBeGreaterThan(300);
    const moved = await expectNativeHero(page);
    expect(moved.root.y).toBeLessThan(-15);
    expect(moved.root.y).toBeLessThan(start.root.y - 15);
    // An immediate jump must also resolve through the CSS range in two frames,
    // with no old quickTo easing period or JavaScript transform writes.
    await scrollMastTo(page, 0.75);
    await scrollMastTo(page, 0.25);
    const paint = await page.locator(".home-mast-art").evaluate((art) => {
      window.__heroDrawingObserver.disconnect();
      return {
        mutations: window.__heroDrawingMutations,
        inlineTransform: art.style.transform, svgTransform: art.getAttribute("transform"),
        willChange: getComputedStyle(art).willChange, overflow: getComputedStyle(art).overflow,
        clip: getComputedStyle(art).clipPath,
      };
    });
    expect(paint.mutations, "native CSS motion writes no root or inner drawing attributes").toEqual([]);
    expect(paint.inlineTransform).toBe("");
    expect(paint.svgTransform).toBeNull();
    expect(paint.willChange).toContain("transform");
    expect(paint.overflow).toBe("visible");
    expect(paint.clip).toBe("inset(0px 0px -48px)");
  });

  test("repeated wide-touch, reduced-motion and no-motion transitions retain one native CSS animation", async ({ page }) => {
    await openHome(page);
    for (const width of [1440, 390, 1440, 390]) {
      await scrollMastTo(page, 0.45);
      await rememberHeroController(page);
      await page.setViewportSize({ width, height: 844 });
      await expectOldHeroControllerRemoved(page);
      await expectNativeHero(page);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await expectStaticHero(page);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await expectNativeHero(page);
      await page.locator("html").evaluate((html) => html.classList.add("no-motion"));
      await expectStaticHero(page);
      await page.locator("html").evaluate((html) => html.classList.remove("no-motion"));
      await expectNativeHero(page);
    }
  });

  for (const enlarged of [false, true]) test(`native CSS range follows the actual ${enlarged ? "200% text-reflow tall" : "normal"} mast height`, async ({ page }, testInfo) => {
    await openHome(page);
    const mast = page.locator(".home-mast");
    await expect(mast).not.toHaveAttribute("data-text-reflow");
    if (enlarged) {
      const sizes = await page.evaluate(() => {
        const entries = [...document.querySelectorAll(".navbar, .navbar *, .home-banner-section, .home-banner-section *")]
          .filter((element) => element instanceof HTMLElement)
          .map((element) => ({ element, size: parseFloat(getComputedStyle(element).fontSize) }));
        for (const { element, size } of entries) element.style.setProperty("font-size", `${size * 2}px`, "important");
        return entries.map(({ element, size }) => ({
          element: `${element.tagName}.${element.className}`, before: size,
          after: parseFloat(getComputedStyle(element).fontSize),
        }));
      });
      expect(sizes.length).toBeGreaterThan(10);
      for (const entry of sizes) expect(entry.after, entry.element).toBeCloseTo(entry.before * 2, 2);
      await testInfo.attach("native-range-real-text-resize", { body: JSON.stringify(sizes, null, 2), contentType: "application/json" });
      await expect(mast).toHaveAttribute("data-text-reflow", "");
    }
    const initial = await expectNativeHero(page);
    if (enlarged) expect(initial.height).toBeGreaterThan(initial.viewportHeight + 100);
    else expect(initial.height).toBeLessThan(initial.viewportHeight);
    const positions = [];
    for (const fraction of [0.25, 0.5, 0.9, 1, 0]) {
      const state = await scrollMastTo(page, fraction);
      expect(state.progress).toBeCloseTo(fraction, 2);
      expectStillContent(initial.content, state.content);
      positions.push({ requested: fraction, height: state.height, top: state.mastTop, actual: state.progress, y: state.root.y });
    }
    await testInfo.attach("native-range-geometry", { body: JSON.stringify(positions, null, 2), contentType: "application/json" });
  });

  test("unsupported view-timeline enhancement keeps the header static and the native CTA usable", async ({ page }) => {
    // Make this one CSS feature query false rather than disabling JavaScript or
    // replacing the animation itself: the authored progressive fallback must win.
    await page.route("**/assets/css/responsive.*.css", async (route) => {
      const response = await route.fetch();
      const css = await response.text();
      const featureQuery = "@supports (view-timeline-name: --home-mast-scroll) and";
      expect(css.split(featureQuery)).toHaveLength(2);
      await route.fulfill({ response, body: css.replace(featureQuery, "@supports (codex-unsupported-scroll-timeline: unavailable) and") });
    });
    await openHome(page);
    expect(await page.evaluate(() => CSS.supports("codex-unsupported-scroll-timeline: unavailable"))).toBe(false);
    await swipeHeader(page, 400);
    await expect.poll(() => heroState(page).then((state) => state.scrollY)).toBeGreaterThan(300);
    await expectStaticHero(page);
    await page.locator(".hero-work-link").tap();
    await expect(page).toHaveURL(/\/works$/);
  });
});

for (const fallback of [
  { name: "reduced motion", reducedMotion: "reduce" },
  { name: "unavailable GSAP", blockGsap: true },
  { name: "no JavaScript", javaScriptEnabled: false },
]) test.describe("mobile header fallback: " + fallback.name, () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true,
    javaScriptEnabled: fallback.javaScriptEnabled !== false });
  test(fallback.reducedMotion ? "keeps the decorative layers static and the native CTA usable" : "keeps native CSS motion and the native CTA usable without GSAP", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: fallback.reducedMotion || "no-preference" });
    expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(fallback.reducedMotion === "reduce");
    if (fallback.blockGsap) await page.route("**/assets/js/vendor/gsap.min.js", (route) => route.abort());
    await page.goto("/", { waitUntil: "load" });
    await page.waitForFunction(() => !document.fonts || document.fonts.status === "loaded");
    await expect(page.locator(".home-banner-title")).toHaveText("Product VP");
    if (fallback.javaScriptEnabled !== false) {
      await expect.poll(() => page.evaluate(() => window.PortfolioMedia?.isReduced())).toBe(fallback.reducedMotion === "reduce");
    }
    if (fallback.reducedMotion === "reduce") await expect(page.locator("html")).toHaveClass(/no-motion/);
    const scripting = { javaScriptEnabled: fallback.javaScriptEnabled !== false };
    const start = await heroState(page);
    // Without navigation JavaScript, the expanded native menu precedes the
    // mast. Include that document offset so the same visible depth is reached.
    const distance = scripting.javaScriptEnabled ? 400 :
      Math.min(600, Math.round(Math.max(0, start.mastTop) + start.height * 0.55));
    await swipeHeader(page, distance, scripting);
    await expect.poll(() => heroState(page).then((state) => state.scrollY)).toBeGreaterThan(300);
    if (fallback.reducedMotion) await expectStaticHero(page);
    else {
      expect(await page.evaluate(() => typeof window.gsap)).toBe("undefined");
      const state = await expectNativeHero(page, scripting);
      expect(state.root.y).toBeLessThan(-15);
    }
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
