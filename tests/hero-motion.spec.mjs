import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1280, height: 900 } });
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    localStorage.setItem("bn-analytics-consent-v1", JSON.stringify({ version: 1, decision: "rejected", timestamp: Date.now() }));
    sessionStorage.setItem("nb-arrival-seen-v2", "1");
  });
});

async function openScene(page) {
  await page.goto("/", { waitUntil: "load" });
  await expect(page.locator(".home-banner-title")).toHaveText("Product VP");
  await expect.poll(() => page.evaluate(() => window.PortfolioHeroScene?.status)).toBe("ready");
}
async function paintedScene(page) {
  return createHash("sha256").update(await page.locator(".home-mast-canvas").screenshot()).digest("hex");
}
async function readingGeometry(page) {
  return page.locator(".home-mast-baseline, .home-mast-intro, .home-mast-proof-chips").evaluateAll((elements) => elements.map((element) => {
    const box = element.getBoundingClientRect();
    return [box.x, box.y + scrollY, box.width, box.height];
  }));
}

test("first arrival waits for Enter, then the central sculpture actually assembles", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.removeItem("nb-arrival-seen-v2"));
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const enter = page.getByRole("button", { name: "Enter the portfolio" });
  await expect(enter).toBeVisible({ timeout: 8000 });
  await expect(page.locator(".site-arrival__counter")).toHaveText("100");
  await page.keyboard.press("Enter");
  await expect(page.locator(".site-arrival")).toHaveCount(0);
  const assembling = await paintedScene(page);
  await page.waitForTimeout(1800);
  expect(await paintedScene(page), "the 2.3s assembly continues after the one-second curtain exits").not.toEqual(assembling);
  await expect(page.locator(".home-banner-title")).toBeInViewport();
  await expect(page.locator(".hero-work-link")).toBeInViewport();
});

test("WebGL pointer response and drag change the sculpture without moving reading or link geometry", async ({ page }) => {
  await openScene(page);
  await page.evaluate(() => window.PortfolioHeroScene.finish());
  await page.waitForTimeout(200);
  const geometry = await readingGeometry(page);
  const resting = await paintedScene(page);
  await page.mouse.move(820, 380);
  await page.waitForTimeout(600);
  expect(await paintedScene(page)).not.toEqual(resting);
  const hovered = await paintedScene(page);
  await page.mouse.move(640, 440);
  await page.mouse.down();
  await page.mouse.move(760, 460, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  expect(await paintedScene(page), "drag produces a different painted pose").not.toEqual(hovered);
  expect(await readingGeometry(page)).toEqual(geometry);
});

async function reachSplitComposition(page) {
  await page.locator(".home-mast-track").evaluate((track) => {
    const box = track.getBoundingClientRect();
    const scene = track.querySelector(".home-mast-scene").getBoundingClientRect();
    scrollTo(0, box.top + scrollY + Math.max(0, box.height - scene.height));
  });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

for (const width of [320, 390, 1280]) {
  test(`${width}: native scroll reveals the split composition without horizontal overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openScene(page);
    const trackGeometry = () => page.locator(".home-mast-track").evaluate((track) => {
      const box = track.getBoundingClientRect();
      return [box.top + scrollY, box.width, box.height];
    });
    const geometry = await trackGeometry();
    await page.mouse.wheel(0, 650);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(300);
    expect(await trackGeometry(), "native scrolling changes the composition without changing the reserved track").toEqual(geometry);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await reachSplitComposition(page);
    await expect(page.locator(".home-mast-intro")).toHaveCSS("opacity", "1");
    await expect(page.locator(".home-mast-proof-chips")).toBeVisible();
    await expect(page.locator(".home-intro-work")).toHaveAttribute("href", "/works");
  });
}

test("header journey follows actual native page progress and becomes stable for keyboard navigation", async ({ page }) => {
  await openScene(page);
  const nav = page.locator(".navbar");
  const top = await nav.boundingBox();
  // The opening/work chapter intentionally keeps its quiet top bar. Travel
  // resumes in the following reading chapters; their position follows content.
  const foundTravelSlot = await page.locator("#works").evaluate(async (work) => {
    const start = work.getBoundingClientRect().bottom + scrollY + 10;
    const header = document.querySelector(".navbar");
    for (let step = 0; step <= 8; step += 1) {
      scrollTo(0, start + step * 96);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      if (header.getBoundingClientRect().top > 100 && !header.hasAttribute("data-reading-dock") && !header.hasAttribute("data-composition-nav")) return true;
    }
    return false;
  });
  expect(foundTravelSlot, "the reading chapter must contain a real travelling slot beyond the quiet work chapter").toBe(true);
  await expect.poll(() => nav.evaluate((element) => element.getBoundingClientRect().top)).toBeGreaterThan(top.y + 100);
  const actualProgress = await page.evaluate(() => String(Math.max(1, Math.round(scrollY / (document.documentElement.scrollHeight - innerHeight) * 100))).padStart(3, "0"));
  await expect(page.locator(".home-nav-progress span")).toHaveText(actualProgress);
  await page.keyboard.press("Tab");
  await page.locator(".navbar .nav-logo-wrap").focus();
  await expect.poll(() => nav.evaluate((element) => Math.abs(element.getBoundingClientRect().top))).toBeLessThan(1);
  await expect(page.locator(".navbar .nav-logo-wrap")).toBeFocused();
});

test("header changes reading slots through a bounded opacity settle and real keyboard or reduced motion cancels it", async ({ page }) => {
  await openScene(page);
  const nav = page.locator(".navbar");
  const crossReadingBoundary = () => page.evaluate(async () => {
    const header = document.querySelector(".navbar");
    const frames = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const state = () => {
      const animation = header.getAnimations()[0];
      window.__observedSlotFade = animation;
      const box = header.getBoundingClientRect();
      const readingBoxes = [...document.querySelectorAll("main h1, main h2, main h3, main p, main li, main .awards-card, main figure")]
        .filter((element) => {
          if (element.closest('[aria-hidden="true"]')) return false;
          let alpha = 1;
          for (let node = element; node; node = node.parentElement) alpha *= Number(getComputedStyle(node).opacity);
          return alpha > .99 && getComputedStyle(element).visibility === "visible";
        }).map((element) => element.getBoundingClientRect()).filter((reading) => reading.width > 1 && reading.height > 1);
      return {
        frames: animation?.effect.getKeyframes(), duration: animation?.effect.getTiming().duration,
        opacity: Number(getComputedStyle(header).opacity),
        clear: readingBoxes.length > 0 && readingBoxes.every((reading) => box.bottom <= reading.top - 11 || box.top >= reading.bottom + 11),
        y: scrollY, counter: document.querySelector(".home-nav-progress span").textContent,
        progress: String(Math.max(1, Math.round(scrollY / (document.documentElement.scrollHeight - innerHeight) * 100))).padStart(3, "0"),
      };
    };
    const cross = async (from, to) => {
      scrollTo(0, from); await frames();
      await new Promise((resolve) => setTimeout(resolve, 220));
      const previousTop = header.getBoundingClientRect().top;
      scrollTo(0, to); await frames();
      return Math.abs(header.getBoundingClientRect().top - previousTop);
    };
    if (window.__homeSlotCrossing) {
      await cross(...window.__homeSlotCrossing);
      return state();
    }
    // The old intro is now sticky artwork. Find a real, bounded large reading
    // slot change after the work chapter instead of relying on its old Y offset.
    const start = document.querySelector("#works").getBoundingClientRect().bottom + scrollY + 10;
    const limit = document.querySelector("footer").getBoundingClientRect().top + scrollY;
    for (let from = start, attempt = 0; from < limit && attempt < 45; from += 64, attempt += 1) {
      const to = from + 64;
      const distance = await cross(from, to);
      if (distance > header.offsetHeight * 2 && header.getAnimations().length && !header.hasAttribute("data-reading-dock")) {
        window.__homeSlotCrossing = [from, to];
        return state();
      }
    }
    return state();
  });
  const settledState = () => nav.evaluate(async (header) => {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return { opacity: Number(getComputedStyle(header).opacity), count: header.getAnimations().length,
      observedState: window.__observedSlotFade?.playState, y: scrollY };
  });
  const crossing = await crossReadingBoundary();
  expect(crossing.frames, "the actual above-to-below crossing must settle visibly").toHaveLength(2);
  expect(crossing.frames.map((frame) => frame.opacity)).toEqual(["0", "1"]);
  expect(crossing.frames.every((frame) => !["transform", "translate", "scale", "rotate"].some((key) => key in frame)),
    "the navigation must never animate through the reading text").toBe(true);
  expect(crossing.duration).toBeGreaterThan(0);
  expect(crossing.duration).toBeLessThanOrEqual(250);
  expect(crossing.opacity).toBeLessThan(1);
  expect(crossing.clear).toBe(true);
  expect(crossing.counter).toBe(crossing.progress);
  await page.waitForTimeout(220);
  expect(await settledState()).toMatchObject({ opacity: 1, count: 0 });

  // Select an existing focus predecessor whose next native Tab must reach a
  // control below the current view, without manufacturing fixture controls.
  const preparedNativeTab = await page.evaluate(() => {
    const controls = [...document.querySelectorAll("main a[href], main button, footer a[href], footer button")]
      .filter((element) => element.getClientRects().length && getComputedStyle(element).visibility === "visible" && element.tabIndex >= 0);
    const next = controls.findIndex((element) => element.getBoundingClientRect().top > innerHeight + 80);
    if (next < 1) return false;
    controls[next - 1].focus({ preventScroll: true });
    return true;
  });
  expect(preparedNativeTab).toBe(true);
  const keyboardCrossing = await crossReadingBoundary();
  await page.keyboard.press("Tab");
  const keyboard = await settledState();
  expect(keyboard).toMatchObject({ opacity: 1, count: 0, observedState: "idle" });
  expect(Math.abs(keyboard.y - keyboardCrossing.y), "real Tab also exercises the browser's native focus scroll").toBeGreaterThan(20);

  await openScene(page);
  await crossReadingBoundary();
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await settledState(), "a preference change cancels the observed animation instead of waiting for it to finish")
    .toMatchObject({ opacity: 1, count: 0, observedState: "idle" });
});

test("reduced motion freezes the painted sculpture and the travelling header", async ({ page }) => {
  await openScene(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("html")).toHaveClass(/no-motion/);
  const fallback = page.locator(".home-mast-gate-fallback");
  await expect(fallback).toBeVisible();
  await expect(fallback).toHaveCSS("opacity", "1");
  await expect(page.locator(".home-mast-canvas")).toBeHidden();
  await expect(page.locator(".home-mast-fallback")).toBeHidden();
  const paintedFallback = async () => createHash("sha256").update(await fallback.screenshot()).digest("hex");
  await page.waitForTimeout(200);
  const quiet = await paintedFallback();
  await page.mouse.move(820, 360);
  await page.mouse.down(); await page.mouse.move(450, 540, { steps: 10 }); await page.mouse.up();
  await page.waitForTimeout(300);
  // In static mode the native drag may select the underlying SVG image.
  // Clear that browser selection so the comparison measures scene movement.
  await page.evaluate(() => getSelection().removeAllRanges());
  expect(await paintedFallback()).toEqual(quiet);
  await page.evaluate(() => window.scrollTo(0, 900));
  await expect.poll(() => page.locator(".navbar").evaluate((element) => Math.abs(element.getBoundingClientRect().top))).toBeLessThan(1);
});

test("destroying the hero scene stops rendering and preserves the visible SVG fallback", async ({ page }) => {
  await openScene(page);
  await page.evaluate(() => {
    const context = document.querySelector(".home-mast-canvas").getContext("webgl");
    const draw = context.drawArrays.bind(context);
    window.__drawsAfterDestroy = 0;
    context.drawArrays = (...args) => { window.__drawsAfterDestroy += 1; return draw(...args); };
    window.PortfolioHeroScene.destroy();
  });
  await page.mouse.move(800, 300);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__drawsAfterDestroy)).toBe(0);
  // Explicit teardown retains the current opening pose. A real WebGL failure
  // separately switches to the complete static reading composition below.
  await expect(page.locator(".home-mast-fallback")).toBeVisible();
  await expect(page.locator(".home-mast-fallback")).toHaveCSS("opacity", "1");
  await expect(page.locator(".home-mast-gate-fallback")).toBeHidden();
  await expect(page.locator(".home-mast-canvas")).toHaveCSS("opacity", "0");
  await page.locator(".hero-work-link").click();
  await expect(page).toHaveURL(/\/works$/);
});

test("unavailable WebGL preserves the original fallback artwork and native navigation", async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return /webgl/.test(type) ? null : getContext.call(this, type, ...args);
    };
  });
  await page.goto("/", { waitUntil: "load" });
  await expect.poll(() => page.evaluate(() => window.PortfolioHeroScene?.status)).toBe("fallback");
  await expect(page.locator(".home-mast-gate-fallback")).toBeVisible();
  await expect(page.locator(".home-mast-gate-fallback")).toHaveCSS("opacity", "1");
  await expect(page.locator(".home-mast-fallback")).toBeHidden();
  await expect(page.locator(".home-mast-canvas")).toBeHidden();
  await expect(page.locator(".home-banner-title")).toHaveText("Product VP");
  await page.locator(".home-intro-work").click();
  await expect(page).toHaveURL(/\/works$/);
});

test.describe("native touch input", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test("real touch scroll remains native and the primary action follows on its first tap", async ({ page }) => {
    await openScene(page);
    const session = await page.context().newCDPSession(page);
    try {
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 190, y: 650, id: 1 }] });
      for (let step = 1; step <= 12; step += 1) {
        await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 190, y: 650 - step * 28, id: 1 }] });
        await page.waitForTimeout(24);
      }
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    } finally { await session.detach(); }
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(200);
    await reachSplitComposition(page);
    await page.locator(".home-intro-work").tap();
    await expect(page).toHaveURL(/\/works$/);
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test("title, original fallback artwork and native links render immediately", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    await expect(page.locator(".site-arrival")).toHaveCount(0);
    await expect(page.locator(".home-banner-title")).toHaveText("Product VP");
    await expect(page.locator(".home-mast-gate-fallback")).toBeVisible();
    await expect(page.locator(".home-mast-gate-fallback")).toHaveCSS("opacity", "1");
    await expect(page.locator(".home-mast-fallback")).toBeHidden();
    await expect(page.locator(".home-mast-canvas")).toBeHidden();
    await expect(page.locator(".home-mast-display")).toBeVisible();
    await page.locator(".home-intro-work").tap();
    await expect(page).toHaveURL(/\/works$/);
  });
});

for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
  test(`${viewport.width}: case media unfolds during native scroll while preserving the complete product image`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.addInitScript(() => sessionStorage.setItem("nb-arrival-seen-v2", "1"));
    await page.goto("/work/instructure", { waitUntil: "load" });
    await expect(page.locator("html")).toHaveClass(/gsap-ready/);
    const media = page.locator(".case-hero-media");
    await expect.poll(() => media.locator("img").evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);
    // Isolate the native scroll response from the independent arrival assembly.
    await page.evaluate(() => window.PortfolioCaseOpening.finish());
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
