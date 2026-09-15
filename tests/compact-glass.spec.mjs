import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";

// Without the pinned track the same WebGL object stays live in the drawing slot
// instead of resolving to the flat gate. These viewports are short enough that
// `home-composition.js` never takes the 210svh pin.
const COMPACT = [
  { label: "phone", width: 390, height: 700 },
  { label: "small phone", width: 320, height: 640 },
  { label: "landscape tablet", width: 1024, height: 768 },
  { label: "short desktop window", width: 1440, height: 700 },
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("nb-arrival-seen-v2", "1");
    localStorage.setItem("bn-analytics-consent-v1", JSON.stringify({ version: 1, decision: "rejected", timestamp: Date.now() }));
  });
});

async function openHome(page) {
  await page.goto("/", { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(() => page.evaluate(() => window.PortfolioHeroScene?.status)).toBe("ready");
}

// Bounding box of the painted object, in viewport coordinates. The stage is a
// flat lilac field, so any pixel far from it belongs to the glass. The copy and
// the chrome paint above the canvas and would be captured with it, so they are
// hidden for the measurement; visibility cannot move the object.
const ABOVE_CANVAS = [".home-mast-intro", ".navbar", ".consent-banner"];

async function objectBox(page) {
  const canvas = page.locator(".home-mast-canvas");
  const conceal = (hidden) => page.evaluate(({ selectors, hidden }) => {
    for (const selector of selectors) {
      const node = document.querySelector(selector);
      if (!node) continue;
      if (hidden) node.style.visibility = "hidden";
      else node.style.removeProperty("visibility");
    }
  }, { selectors: ABOVE_CANVAS, hidden });

  await conceal(true);
  const shot = await canvas.screenshot();
  const box = await canvas.boundingBox();
  await conceal(false);

  const bounds = await page.evaluate(async ({ png }) => {
    const image = new Image();
    image.src = `data:image/png;base64,${png}`;
    await image.decode();
    const surface = document.createElement("canvas");
    surface.width = image.width; surface.height = image.height;
    const context = surface.getContext("2d");
    context.drawImage(image, 0, 0);
    const { data } = context.getImageData(0, 0, image.width, image.height);
    const field = [214, 212, 237];
    let left = image.width, right = -1, top = image.height, bottom = -1;
    for (let y = 0; y < image.height; y++) {
      for (let x = 0; x < image.width; x++) {
        const i = (y * image.width + x) * 4;
        const distance = Math.abs(data[i] - field[0]) + Math.abs(data[i + 1] - field[1]) +
          Math.abs(data[i + 2] - field[2]);
        if (distance <= 24) continue;
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
    return right < 0 ? null : { left, right, top, bottom, width: image.width, height: image.height };
  }, { png: shot.toString("base64") });

  expect(bounds, "the compact slot painted nothing").not.toBeNull();
  const scaleX = box.width / bounds.width, scaleY = box.height / bounds.height;
  return {
    x: box.x + bounds.left * scaleX, y: box.y + bounds.top * scaleY,
    width: (bounds.right - bounds.left) * scaleX, height: (bounds.bottom - bounds.top) * scaleY,
  };
}

// Line boxes, not element boxes: `.home-mast-display` is a full-width block
// whose glyphs occupy a fraction of it, so its border box would report an
// overlap the reader never sees. `.home-intro-work` carries a navy background,
// so there its whole box is ink.
function inkRects(page, selector) {
  return page.evaluate((selector) => {
    const element = document.querySelector(selector);
    if (!element) return [];
    const range = document.createRange();
    range.selectNodeContents(element);
    const rects = [...range.getClientRects()]
      .filter((rect) => rect.width > 1 && rect.height > 1)
      .map((rect) => rect.toJSON());
    if (getComputedStyle(element).backgroundColor !== "rgba(0, 0, 0, 0)") {
      rects.push(element.getBoundingClientRect().toJSON());
    }
    return rects;
  }, selector);
}

function overlaps(a, b) {
  if (!a || !b || !b.width || !b.height) return false;
  return a.x < b.x + b.width && b.x < a.x + a.width &&
    a.y < b.y + b.height && b.y < a.y + a.height;
}

function slot(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector(".home-mast-canvas");
    const gate = document.querySelector(".home-mast-gate-fallback");
    return {
      canvasVisibility: getComputedStyle(canvas).visibility,
      canvasOpacity: Number(getComputedStyle(canvas).opacity),
      gateOpacity: Number(getComputedStyle(gate).opacity),
      overflow: document.documentElement.scrollWidth - innerWidth,
    };
  });
}

for (const { label, width, height } of COMPACT) {
  test(`${label}: the unpinned slot keeps the live object and native scroll turns it`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await openHome(page);

    const mast = page.locator(".home-mast");
    await expect(mast).not.toHaveAttribute("data-morph-active", "");
    await expect(mast).toHaveAttribute("data-glass-live", "");
    await expect(page.locator(".home-mast-sculpture")).toHaveAttribute("data-hero-pose", "compact");

    // Exactly one of the live canvas and the static drawing is visible.
    const state = await slot(page);
    expect(state.canvasVisibility).toBe("visible");
    expect(state.canvasOpacity).toBeGreaterThan(.99);
    expect(state.gateOpacity).toBeLessThan(.01);
    expect(state.overflow).toBeLessThanOrEqual(0);

    // Decoration never covers the role, dek, primary action or proof. The copy
    // paints above the canvas, so hide it while the object is measured; that is
    // a visibility change only and cannot move the object.
    const drawn = await objectBox(page);
    for (const selector of [".home-mast-display", ".home-banner-subtitle",
      ".home-intro-work", ".home-mast-proof-chips"]) {
      for (const rect of await inkRects(page, selector)) {
        expect(overlaps(drawn, rect), `${selector} is under the glass`).toBe(false);
      }
    }

    // Native scroll turns the object; the page is not hijacked to do it.
    const canvas = page.locator(".home-mast-canvas");
    const paint = async () => createHash("sha256").update(await canvas.screenshot()).digest("hex");
    const resting = await paint();
    const before = await page.evaluate(() => scrollY);
    await page.mouse.wheel(0, Math.round(height * .28));
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before);
    await page.waitForTimeout(400);
    expect(await paint()).not.toBe(resting);

    // Standing still leaves it still: no idle rotation.
    const held = await paint();
    await page.waitForTimeout(700);
    expect(await paint()).toBe(held);
  });
}

test("the compact slot completes the arrival assembly instead of jumping to the endpoint", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect.poll(() => page.evaluate(() => window.PortfolioHeroScene?.status)).toBe("ready");
  const canvas = page.locator(".home-mast-canvas");
  const paint = async () => createHash("sha256").update(await canvas.screenshot()).digest("hex");
  // Fragments are still travelling well inside the 2.3s assembly.
  const early = await paint();
  await page.waitForTimeout(900);
  expect(await paint()).not.toBe(early);
  await page.waitForTimeout(2200);
  const settled = await paint();
  await page.waitForTimeout(600);
  expect(await paint()).toBe(settled);
});

test("reduced motion keeps one static drawing and never both forms", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openHome(page);
  await expect(page.locator(".home-mast")).not.toHaveAttribute("data-glass-live", "");
  const state = await slot(page);
  expect(state.canvasVisibility).toBe("hidden");
  expect(state.gateOpacity).toBeGreaterThan(.99);
});

test("unavailable WebGL leaves the compact slot on its static drawing", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type) {
      if (String(type).indexOf("webgl") === 0) return null;
      return original.apply(this, arguments);
    };
  });
  await page.goto("/", { waitUntil: "load" });
  await expect.poll(() => page.evaluate(() => window.PortfolioHeroScene?.status)).toBe("fallback");
  await expect(page.locator(".home-mast")).not.toHaveAttribute("data-glass-live", "");
  const state = await slot(page);
  expect(state.canvasVisibility).toBe("hidden");
  expect(state.gateOpacity).toBeGreaterThan(.99);
});

test("a tall viewport keeps the pinned track and hands the pose back to the morph owner", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await openHome(page);
  await expect(page.locator(".home-mast")).toHaveAttribute("data-morph-active", "");
  await expect(page.locator(".home-mast")).not.toHaveAttribute("data-glass-live", "");
  await expect(page.locator(".home-mast-sculpture")).not.toHaveAttribute("data-hero-pose", "compact");
  const state = await slot(page);
  expect(state.canvasVisibility).toBe("visible");
  expect(state.gateOpacity).toBeLessThan(.01);
});
