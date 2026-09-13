import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 900 } });

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    localStorage.setItem("bn-analytics-consent-v1", JSON.stringify({
      version: 1, decision: "rejected", timestamp: Date.now(),
    }));
    window.__arrivalChanges = [];
    new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType === 1 && node.matches(".site-arrival")) {
            window.__arrivalChanges.push({ state: "shown", at: performance.now() });
          }
        }
        for (const node of record.removedNodes) {
          if (node.nodeType === 1 && node.matches(".site-arrival")) {
            window.__arrivalChanges.push({ state: "removed", at: performance.now() });
          }
        }
      }
    }).observe(document, { childList: true, subtree: true });
  });
});

async function openHome(page) {
  await page.goto("/", { waitUntil: "load" });
  await expect(page.locator(".site-arrival")).toHaveCount(0, { timeout: 3000 });
  await page.waitForFunction(() => !document.fonts || document.fonts.status === "loaded");
  await expect(page.locator(".home-banner-title")).toHaveText("Product VP");
}

async function heroState(page) {
  return page.evaluate(() => {
    const mast = document.querySelector(".home-mast");
    const art = mast.querySelector(".home-mast-art");
    const sculpture = mast.querySelector(".home-mast-sculpture");
    const targets = [sculpture, art, ...art.querySelectorAll("*")];
    return {
      transforms: [sculpture, art].map((element) => getComputedStyle(element).transform),
      nativeAnimations: art.getAnimations().filter((animation) =>
        typeof ViewTimeline === "function" && animation.timeline instanceof ViewTimeline).length,
      content: [...mast.querySelectorAll(".hero-kicker, .home-banner-title, .home-banner-subtitle, .home-mast-proof-chips, .home-banner-outcomes, .hero-work-link")].map((element) => {
        const rect = element.getBoundingClientRect();
        return { x: rect.x, y: rect.y + scrollY, width: rect.width, height: rect.height };
      }),
      triggers: window.ScrollTrigger?.getAll().filter((trigger) => trigger.trigger === mast).length || 0,
      activeTweens: window.gsap?.getTweensOf(targets, true).length || 0,
      height: mast.getBoundingClientRect().height,
      scrollY,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
}

function expectStillContent(before, after) {
  expect(after).toHaveLength(before.length);
  for (let index = 0; index < before.length; index += 1) {
    for (const axis of ["x", "y", "width", "height"]) {
      expect(Math.abs(before[index][axis] - after[index][axis]), `reading content ${index} ${axis} stays in document flow`).toBeLessThan(0.5);
    }
  }
}

async function scrollMastTo(page, fraction) {
  await page.evaluate((progress) => {
    const rect = document.querySelector(".home-mast").getBoundingClientRect();
    window.scrollTo(0, scrollY + rect.top + rect.height * progress);
  }, fraction);
  await page.waitForTimeout(80);
  return heroState(page);
}

async function expectUnblocked(page) {
  await expect(page.locator(".site-arrival")).toHaveCount(0, { timeout: 3000 });
  expect(await page.evaluate(() => ({
    inert: Boolean(document.querySelector("main[inert], body[inert], html[inert]")),
    locked: [document.documentElement, document.body].some((element) => ["hidden", "clip"].includes(getComputedStyle(element).overflowY)),
  }))).toEqual({ inert: false, locked: false });
}

for (const route of ["/", "/work/benker"]) {
  test(`${route}: arrival clears promptly and only runs once per session`, async ({ page }) => {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expectUnblocked(page);
    const changes = await page.evaluate(() => window.__arrivalChanges);
    expect(changes.map((change) => change.state)).toEqual(["shown", "removed"]);
    expect(changes[1].at - changes[0].at, "the arrival is bounded even if media loading stalls").toBeLessThan(2600);
    await page.reload({ waitUntil: "load" });
    await expectUnblocked(page);
    expect(await page.evaluate(() => window.__arrivalChanges)).toEqual([]);
    await page.goto(route === "/" ? "/work/benker" : "/", { waitUntil: "load" });
    await expectUnblocked(page);
    expect(await page.evaluate(() => window.__arrivalChanges), "moving between home and projects does not replay the arrival").toEqual([]);
  });
}

test("arrival watchdog clears the curtain when CSS animation completion is lost", async ({ page }) => {
  await page.route("**/assets/css/responsive.*.css", async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()) + "\n.site-arrival { animation: none !important; }" });
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".site-arrival")).toHaveCount(1);
  await expectUnblocked(page);
  const changes = await page.evaluate(() => window.__arrivalChanges);
  expect(changes.map((change) => change.state)).toEqual(["shown", "removed"]);
  expect(changes[1].at - changes[0].at, "lost animationend must not strand a full-screen curtain").toBeLessThan(2600);
});

test("a first-visit deep link reaches its section without an arrival curtain", async ({ page }) => {
  await page.goto("/#works", { waitUntil: "load" });
  await expectUnblocked(page);
  expect(await page.evaluate(() => window.__arrivalChanges)).toEqual([]);
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(100);
  await expect(page.locator("#works")).toBeInViewport();
});

for (const input of ["keyboard", "wheel", "pointer", "reduced motion"]) {
  test(`arrival yields immediately to ${input}`, async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".site-arrival")).toHaveCount(1);
    if (input === "keyboard") await page.keyboard.press("Tab");
    if (input === "wheel") await page.mouse.wheel(0, 240);
    if (input === "pointer") await page.mouse.click(2, 2);
    if (input === "reduced motion") await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator(".site-arrival")).toHaveCount(0, { timeout: 500 });
    await expectUnblocked(page);
  });
}

for (const mode of ["missing GSAP", "missing ScrollTrigger", "missing arrival script", "reduced motion", "unavailable storage"]) {
  test(`arrival fallback: ${mode} leaves the page usable`, async ({ page }) => {
    if (mode === "missing GSAP") await page.route("**/assets/js/vendor/gsap.min.js", (route) => route.abort());
    if (mode === "missing ScrollTrigger") await page.route("**/assets/js/vendor/ScrollTrigger.min.js", (route) => route.abort());
    if (mode === "missing arrival script") await page.route(/\/assets\/js\/arrival(?:\.[a-f0-9]+)?\.js/, (route) => route.abort());
    if (mode === "reduced motion") await page.emulateMedia({ reducedMotion: "reduce" });
    if (mode === "unavailable storage") await page.addInitScript(() => {
      Object.defineProperty(window, "sessionStorage", { get() { throw new DOMException("Unavailable", "SecurityError"); } });
    });
    await openHome(page);
    await expectUnblocked(page);
    if (mode !== "unavailable storage") expect(await page.evaluate(() => window.__arrivalChanges)).toEqual([]);
    await page.locator(".hero-work-link").click();
    await expect(page).toHaveURL(/\/works$/);
  });
}

for (const width of [320, 390, 1440]) {
  test(`${width}: native scroll changes the sculpture while reading content stays still`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openHome(page);
    const start = await heroState(page);
    expect(start.nativeAnimations).toBe(1);
    expect(start.triggers, "CSS-supported browsers need no competing hero scroll controller").toBe(0);
    const middle = await scrollMastTo(page, 0.55);
    expect(middle.scrollY).toBeGreaterThan(100);
    expect(middle.transforms).not.toEqual(start.transforms);
    expectStillContent(start.content, middle.content);
    expect(middle.overflow).toBeLessThanOrEqual(1);
    const offscreen = await scrollMastTo(page, 1.2);
    await page.waitForTimeout(200);
    expect((await heroState(page)).transforms, "decorative motion settles when scrolling stops").toEqual(offscreen.transforms);
    const returned = await scrollMastTo(page, 0);
    expect(returned.transforms).toEqual(start.transforms);
    expectStillContent(start.content, returned.content);
  });
}

test("repeated viewport and motion-preference changes retain one native controller and clear active animation", async ({ page }) => {
  await openHome(page);
  for (const width of [390, 1440, 991, 992]) {
    await page.setViewportSize({ width, height: 900 });
    await scrollMastTo(page, 0.4);
    expect((await heroState(page)).nativeAnimations).toBe(1);
    expect((await heroState(page)).triggers).toBe(0);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect.poll(() => heroState(page).then((state) => state.nativeAnimations + state.activeTweens + state.triggers)).toBe(0);
    const reduced = await heroState(page);
    await scrollMastTo(page, 0.8);
    expect((await heroState(page)).transforms).toEqual(reduced.transforms);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect.poll(() => heroState(page).then((state) => state.nativeAnimations)).toBe(1);
  }
});

test.describe("native touch input", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test("the first tap follows the primary action through an active arrival", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".site-arrival")).toHaveCount(1);
    await page.locator(".hero-work-link").tap();
    await expect(page).toHaveURL(/\/works$/);
  });
  test("a real touch gesture scrolls the document and moves the sculpture", async ({ page }) => {
    await openHome(page);
    const initial = await heroState(page);
    const session = await page.context().newCDPSession(page);
    try {
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 190, y: 650, id: 1 }] });
      for (let step = 1; step <= 12; step += 1) {
        await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 190, y: 650 - step * 28, id: 1 }] });
        await page.waitForTimeout(24);
      }
      await page.waitForTimeout(100);
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    } finally { await session.detach(); }
    await expect.poll(() => heroState(page).then((state) => state.scrollY)).toBeGreaterThan(200);
    const scrolled = await heroState(page);
    expect(scrolled.transforms).not.toEqual(initial.transforms);
    expectStillContent(initial.content, scrolled.content);
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test("content renders immediately and the first native link tap works", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    await expect(page.locator(".site-arrival")).toHaveCount(0);
    await expect(page.locator(".home-banner-title")).toHaveText("Product VP");
    const before = await heroState(page);
    const after = await scrollMastTo(page, 0.5);
    expect(after.transforms).not.toEqual(before.transforms);
    expectStillContent(before.content, after.content);
    await page.locator(".hero-work-link").tap();
    await expect(page).toHaveURL(/\/works$/);
  });
});

for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
  test(`${viewport.width}: case media unfolds during native scroll while preserving the complete product image`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.addInitScript(() => sessionStorage.setItem("nb-arrival-seen-v1", "1"));
    await page.goto("/work/instructure", { waitUntil: "load" });
    await expect(page.locator("html")).toHaveClass(/gsap-ready/);
    const media = page.locator(".case-hero-media");
    await expect.poll(() => media.locator("img").evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);
    const state = () => media.evaluate((element) => {
      const image = element.querySelector("img");
      const box = element.getBoundingClientRect();
      return {
        transform: getComputedStyle(element).transform,
        width: box.width, height: box.height,
        inViewport: box.bottom > 0 && box.top < innerHeight,
        image: {
          src: image.getAttribute("src"), srcset: image.getAttribute("srcset"),
          sizes: image.getAttribute("sizes"), alt: image.getAttribute("alt"),
          width: image.getAttribute("width"), height: image.getAttribute("height"),
          naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight,
          objectFit: getComputedStyle(image).objectFit,
        },
      };
    });
    await expect.poll(() => state().then((value) => value.transform)).not.toBe("none");
    const before = await state();
    expect(before.image.alt).toMatch(/Canvas Career/);
    expect(Number(before.image.width)).toBeGreaterThan(0);
    expect(Number(before.image.height)).toBeGreaterThan(0);
    expect(before.image.objectFit).toBe("contain");
    // Previously the media-owned range was already complete at 1280×900.
    // A real document scroll must produce a visible pose change after arrival.
    await page.evaluate(() => window.scrollTo(0, 250));
    await expect.poll(() => state().then((after) =>
      Math.max(Math.abs(after.width - before.width), Math.abs(after.height - before.height))
    ), { message: "product media must visibly unfold in response to user scrolling" }).toBeGreaterThan(0.5);
    const scrolled = await state();
    expect(scrolled.transform).not.toEqual(before.transform);
    expect(scrolled.inViewport).toBe(true);
    expect(scrolled.image, "scrolling preserves the complete source, description and contain fit").toEqual(before.image);

    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator("html")).toHaveClass(/no-motion/);
    await page.evaluate(() => window.scrollTo(0, 0));
    const reduced = await state();
    await page.evaluate(() => window.scrollTo(0, 250));
    await page.waitForTimeout(500);
    const reducedScrolled = await state();
    expect(reducedScrolled.transform, "reduced motion stays static during native scrolling").toEqual(reduced.transform);
    expect(reducedScrolled.image).toEqual(before.image);
  });
}
